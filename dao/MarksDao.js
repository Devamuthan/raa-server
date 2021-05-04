const config = require( '../util/MysqlUtil' )
const mysql = require('mysql2/promise')
const log4js = require( 'log4js' )

const logger = log4js.getLogger()
logger.level = 'info'

const DATA_ADDED_SUCCESSFULLY = "Data Added Successfully";

const DATA_RETRIEVED_SUCCESSFULLY = "Data Retrieved Successfully";

class MarksDao  {

    async addMarks ( marksDTO ) {
        logger.info( 'Entering | MarksDao::addMarks' )
        this.conn = await mysql.createConnection(config)
        const data = marksDTO.marksData.data
        const type = marksDTO.marksData.type
        const grades = {
            'O': 10,
            'A+': 9,
            'A': 8,
            'B+': 7,
            'B': 6,
            'U': 0
        }
        if ( type === 'before_revaluation' ) {
            let prevNum = null, dept = null, batch = null, sem = null, tableCheck = false
            let subjects = [], credits = {}, tableName
            const regEx1 = /Subjectcode->/i
            const regEx2 = /([1-9])([0-9]{11})/
            try {
                for ( let i = 0; i < data.length; i++ ) {
                    const row = data[ i ].split( '\r' )[ 0 ].split( ',' )
                    if ( regEx1.test( row[ 1 ] ) ) {
                        subjects = []
                        prevNum = null
                        for ( let j = 2; j < row.length; j++ ) {
                            subjects.push( row[ j ] )
                        }
                        continue
                    }
                    if ( subjects === [] ) {
                        continue
                    }
                    if ( regEx2.test( row[ 0 ] ) ) {
                        // Getting Dept, Batch, Sem when new sem comes
                        if ( prevNum === null ) {
                            prevNum = row[ 0 ]
                            let result
                            result = await this.findStudent( row[ 0 ] )
                            dept = result[ 'Class' ]
                            batch = result[ 'Batch' ]
                            sem = await this.findSemester( subjects[ 0 ], dept )
                            tableName = dept + "_" + batch + "_s" + sem

                            credits = await this.findCredits( subjects, dept )
                            tableCheck = await this.tableCheck( tableName, subjects )
                        }
                        // Getting Dept and batch when batches change (i.e) arrears result to current result
                        if ( Math.floor( parseInt( prevNum ) / 1000 ) !== Math.floor( parseInt( row[ 0 ] ) / 1000 ) ) {
                            prevNum = row[ 0 ]
                            let result = await this.findStudent( row[ 0 ] )
                            dept = result[ 'Class' ]
                            batch = result[ 'Batch' ]
                            tableName = dept + "_" + batch + "_s" + sem
                            tableCheck = await this.tableCheck( tableName, subjects )
                        }

                        // Check for arrears and get the table suffix
                        const suffix = await this.checkForArrears( row[ 0 ], tableName )
                        let creditPoint = 0
                        if ( suffix === '' ) {
                            // If Suffix is empty => Current Sem
                            if ( row[ i + 2 ] !== '' ) {
                                for ( let i = 0; i < subjects.length; i++ ) {
                                    creditPoint += grades[ row[ i + 2 ] ] * credits[ subjects[ i ] ]
                                    // console.log("UPDATE " + tableName + " SET " + subjects[ i ] + "='" + row[ i + 2 ] + "' WHERE Registration_Number=" + row[ 0 ])
                                    await this.conn.execute( "UPDATE " + tableName + " SET " + subjects[ i ] + "='" + row[ i + 2 ] + "' WHERE Registration_Number=" + row[ 0 ] )
                                    if ( row[ i + 2 ].toUpperCase() === 'U' ) {
                                        // console.log("INSERT INTO " + tableName + '_failures' + " VALUES(" + row[ 0 ] + ",'" + subjects[ i ] + "')")
                                        await this.conn.execute( "INSERT INTO " + tableName + '_failures' + " VALUES(" + row[ 0 ] + ",'" + subjects[ i ] + "')" )
                                    }
                                }
                            }
                            await this.conn.execute( "UPDATE " + tableName + " SET Credit=" + creditPoint + " WHERE Registration_Number=" + row[ 0 ] )
                        } else {
                            // If Suffix is present => Add to respective arrears tables

                            for ( let i = 0; i < subjects.length; i++ ) {
                                creditPoint += grades[ row[ i + 2 ] ] * credits[ subjects[ i ] ]
                                if ( row[ i + 2 ] !== '' ) {
                                    await this.conn.execute( "INSERT INTO " + tableName + suffix + " VALUES(" + row[ 0 ] + ",'" + subjects[ i ] + "','" + row[ i + 2 ] + "'," + grades[ row[ i + 2 ] ] * credits[ subjects[ i ] ] + ")" )
                                    if ( row[ i + 2 ].toUpperCase() !== 'U' ) {
                                        await this.conn.execute( "DELETE FROM " + tableName + '_failures' + " WHERE Registration_Number=" + row[ 0 ] + " and Subject_Code='" + subjects[ i ] + "'" )
                                    }
                                }
                            }
                        }
                    }
                }
            } catch ( err ) {
                console.log( err )
                marksDTO.success = false
                marksDTO.description = err
                marksDTO.status = 500
                marksDTO.marksData = null
                logger.info( 'Exiting | MarksDao::addMarks | Error' )
                return marksDTO
            }
        }
        marksDTO.success = true
        marksDTO.status = 200
        marksDTO.description = DATA_ADDED_SUCCESSFULLY
        marksDTO.marksData = null
        logger.info( 'Exiting | MarksDao::addMarks' )
        return marksDTO
    }

    async getIndividualMarks ( RegNum, marksDTO ) {
        logger.info( 'Entering | MarksDao::getIndividualMarks' )
        this.conn = await mysql.createConnection(config)
        try {
            const data = []
            let name, studClass, batch
            let result = await this.findStudent( RegNum )
            studClass = result[ 'Class' ]
            batch = result[ 'Batch' ]
            let table = studClass + '_' + batch + '_S'
            //Getting the Name of the Student
            const [ rows ] = await this.conn.execute( 'SELECT Student_Name FROM students WHERE Registration_Number=' + RegNum )
            name = rows[ 0 ][ 'Student_Name' ]
            // Iterating for each sem
            for ( let i = 1; i < 8; i++ ) {
                let subjects = []
                let semMark = {
                    result: {}
                }
                let tableName = table + i
                let [ rows1 ] = await this.conn.execute( 'SELECT * FROM ' + tableName + ' WHERE Registration_Number=' + RegNum )
                let keys = Object.keys( rows1[ 0 ] )
                if ( keys.length > 2 ) {
                    semMark[ 'semester' ] = i
                    // Normal Result
                    for ( let j = 1; j < keys.length; j++ ) {
                        semMark.result[ keys[ j ] ] = rows1[ 0 ][ keys[ j ] ]
                        if ( j > 1 ) {
                            subjects.push( keys[ j ] )
                        }
                    }
                    let credits = await this.findCredits( subjects, studClass )
                    semMark.totalCredits = credits.totalCredits
                    // Getting the arrear1 results of sem i
                    let [ rows ] = await this.conn.execute( 'SELECT * FROM ' + tableName + '_Arrear1' + ' WHERE Registration_Number=' + RegNum )
                    if ( rows.length > 0 ) {
                        semMark.arrear1 = []
                        rows.forEach( row => {
                            let temp = {}
                            temp[ row[ 'Subject_Code' ] ] = row[ 'Grade' ]
                            temp[ 'Credit' ] = row[ 'Credit' ]
                            semMark.arrear1.push( temp )
                        } )
                    }// Getting the arrear2 results of sem i
                    [ rows ] = await this.conn.execute( 'SELECT * FROM ' + tableName + '_Arrear2' + ' WHERE Registration_Number=' + RegNum )
                    if ( rows.length > 0 ) {
                        semMark.arrear2 = []
                        rows.forEach( row => {
                            let temp = {}
                            temp[ row[ 'Subject_Code' ] ] = row[ 'Grade' ]
                            temp[ 'Credit' ] = row[ 'Credit' ]
                            semMark.arrear2.push( temp )
                        } )
                    }// Getting the arrear 3results of sem i
                    [ rows ] = await this.conn.execute( 'SELECT * FROM ' + tableName + '_Arrear3' + ' WHERE Registration_Number=' + RegNum )
                    if ( rows.length > 0 ) {
                        semMark.arrear3 = []
                        rows.forEach( row => {
                            let temp = {}
                            temp[ row[ 'Subject_Code' ] ] = row[ 'Grade' ]
                            temp[ 'Credit' ] = row[ 'Credit' ]
                            semMark.arrear3.push( temp )
                        } )
                    }
                    data.push( semMark )
                }
            }
            marksDTO.marksData = {
                name: name,
                dept: studClass,
                batch: batch,
                regNum: RegNum,
                data: data
            }
        } catch ( err ) {
            console.log( err )
            marksDTO.success = false
            marksDTO.description = err
            marksDTO.status = 500
            marksDTO.marksData = null
            logger.info( 'Exiting | MarksDao::addMarks | Error' )
            return marksDTO
        }

        marksDTO.success = true
        marksDTO.status = 200
        marksDTO.description = DATA_RETRIEVED_SUCCESSFULLY
        logger.info( 'Exiting | MarksDao::getIndividualMarks' )
        return marksDTO
    }

    async findStudent ( regNum ) {
        logger.info( 'Entering | MarksDao::findStudent' )
        try {
            const [ rows ] = await this.conn.execute( 'SELECT Class, Batch FROM students WHERE Registration_Number=' + regNum )
            let data = rows[ 0 ]
            data.Class = data.Class.split( '_' )[ 0 ]
            logger.info( 'Exiting | MarksDao::findStudent' )
            return data
        } catch ( err ) {
            logger.info( 'Exiting | MarksDao::findStudent | Error' )
            throw err
        }
    }

    async findSemester ( subject, dept ) {
        logger.info( 'Entering | MarksDao::findSemester' )
        try {
            // console.log("SELECT Semester FROM subjects WHERE Subject_Code='" + subject + "' and Department='" + dept + "'")
            const [ rows ] = await this.conn.execute( "SELECT Semester FROM subjects WHERE Subject_Code='" + subject + "' and Department='" + dept + "'" )
            // console.log(res.data.rows[ 0 ][ 'Semester' ])
            logger.info( 'Exiting | MarksDao::findSemester' )
            return rows[ 0 ][ 'Semester' ]
        } catch ( err ) {
            logger.info( 'Exiting | MarksDao::findSemester | Error' )
            throw err
        }
    }

    async checkForArrears ( RegNum, tableName ) {
        logger.info( 'Entering | MarksDao::checkForArrears' )
        let suffix = ''
        try {
            const [ rows ] = await this.conn.execute( "SELECT count(*) AS count FROM " + tableName + "_failures " + "WHERE Registration_Number=" + RegNum )
            if ( rows[ 0 ][ 'count' ] !== 0 ) {
                for ( let i = 1; i <= 3; i++ ) {
                    const [ rows ] = await this.conn.execute( "SELECT count(*) AS count FROM " + tableName + "_Arrear" + i + " WHERE Registration_Number=" + RegNum )
                    if ( rows[ 0 ][ 'count' ] === 0 ) {
                        suffix = '_arrear' + i
                        break
                    }
                }
            }
        } catch ( err ) {
            logger.info( 'Exiting | MarksDao::checkForArrears | Error' )
            throw err
        }
        logger.info( 'Exiting | MarksDao::checkForArrears' )
        return suffix
    }

    async tableCheck ( tableName, subjects ) {
        logger.info( 'Entering | MarksDao::tableCheck' )
        try {
            const [ rows ] = await this.conn.execute( "DESC " + tableName )
            const availableSubjects = []
            if ( rows.length < subjects.length + 2 ) {
                rows.forEach( row => {
                    availableSubjects.push( row[ 'Field' ] )
                } )
                for ( let i = 0; i < subjects.length; i++ ) {
                    const sub = subjects[ i ]
                    if ( availableSubjects.indexOf( sub ) < 0 ) {
                        await this.conn.execute( "ALTER TABLE " + tableName + " ADD " + sub + " VARCHAR(2)" )
                    }
                }
            }
            logger.info( 'Exiting | MarksDao::tableCheck' )
            return true
        } catch ( err ) {
            logger.info( 'Exiting | MarksDao::tableCheck | Error' )
            throw err
        }
    }

    async findCredits ( subjects, dept ) {
        logger.info( 'Entering | MarksDao::findCredits' )
        try {
            const credits = {
                totalCredits: 0
            }
            for ( let i = 0; i < subjects.length; i++ ) {
                const subs = subjects[ i ]
                const [ rows ] = await this.conn.execute( "SELECT Credits FROM subjects WHERE Subject_Code='" + subs + "' and Department='" + dept + "'" )
                // console.log(res.data.rows[ 0 ])
                credits[ subs ] = parseInt( rows[ 0 ][ 'Credits' ] )
                credits.totalCredits += parseInt( rows[ 0 ][ 'Credits' ] )
            }
            logger.info( 'Exiting | MarksDao::findCredits' )
            return credits
        } catch ( err ) {
            logger.info( 'Exiting | MarksDao::findCredits | Error' )
            throw err
        }
    }
}

module.exports = MarksDao