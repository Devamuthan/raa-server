const config = require( '../util/MysqlUtil' )
const mysql = require( 'mysql2/promise' )
const log4js = require( 'log4js' )

const logger = log4js.getLogger()
logger.level = 'info'

const DATA_ADDED_SUCCESSFULLY = "Data Added Successfully";
const DATA_RETRIEVED_SUCCESSFULLY = "Data Retrieved Successfully";
const DATA_NOT_FOUND = "Data Not Found";

const NO_DATA_FOUND = 'No Data Found';

class MarksDao {

    async addMarks ( marksDTO ) {
        logger.info( 'Entering | MarksDao::addMarks' )
        this.conn = await mysql.createConnection( config )
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
                // console.log( err )
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
        this.conn = await mysql.createConnection( config )
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
            // console.log( err )
            marksDTO.success = false
            marksDTO.description = err
            marksDTO.status = 500
            marksDTO.marksData = null
            logger.info( 'Exiting | MarksDao::getIndividualMarks | Error' )
            return marksDTO
        }

        marksDTO.success = true
        marksDTO.status = 200
        marksDTO.description = DATA_RETRIEVED_SUCCESSFULLY
        logger.info( 'Exiting | MarksDao::getIndividualMarks' )
        return marksDTO
    }

    async getClassMarks ( Batch, Department, Section, Semester, marksDTO ) {
        logger.info( "Entering | MarksDao::getClassMarks" )
        this.conn = await mysql.createConnection( config )
        try {
            let marks = {}, marks1 = {}, marks2 = {}, marks3 = {}, subjectAvg = {}, subjectAvg1 = {}, subjectAvg2 = {},
                subjectAvg3 = {}, subjects = [], totalCredits, total, passPercent, passPercent1 = 0, passPercent2,
                passPercent3, passPercent4
            const tableName = Department + '_' + Batch + '_s' + Semester
            const [ rows ] = await this.conn.execute( 'SELECT * FROM ' + tableName + ' T, students S WHERE T.REGISTRATION_NUMBER=S.REGISTRATION_NUMBER AND CLASS="' + Department + '_' + Section + '";' )
            if ( rows.length > 0 ) {
                Object.keys( rows[ 0 ] ).filter( item => {
                    if ( item !== 'Registration_Number' && item !== 'Credit' && item !== 'Student_Name' && item !== 'Class' && item !== 'Batch' ) {
                        subjects.push( item )
                    }
                } )
                subjects.forEach( subject => {
                    subjectAvg[ subject ] = 0
                } )
                totalCredits = (await this.findCredits( subjects, Department )).totalCredits
                rows.forEach( item => {
                    const regNo = item[ 'Registration_Number' ]
                    let pass = 1
                    item[ 'GPA' ] = this.format( item.Credit / totalCredits )
                    delete item[ 'Class' ]
                    delete item[ 'Batch' ]
                    delete item[ 'Registration_Number' ]
                    marks[ regNo ] = {
                        ...item
                    }
                    subjects.forEach( subject => {
                        if ( item[ subject ] !== 'U' ) {
                            subjectAvg[ subject ] += 1
                        }else{
                            pass = 0
                        }
                    } )
                    passPercent1 += pass
                } )
                // console.log( passPercent1 )
            } else {
                marksDTO.success = false
                marksDTO.description = NO_DATA_FOUND
                marksDTO.status = 200
                marksDTO.marksData = null
            }
            if ( marksDTO.success ) {
                let [ rows1 ] = await this.conn.execute( 'SELECT COUNT(*) AS TOTAL FROM ' + tableName + ' AS A, STUDENTS AS B WHERE A.REGISTRATION_NUMBER=B.REGISTRATION_NUMBER AND CLASS="' + Department + '_' + Section + '" AND BATCH="' + Batch + '";' )
                total = parseInt( rows1[ 0 ][ 'TOTAL' ] )
                let [ rows2 ] = await this.conn.execute( 'SELECT COUNT(*) AS FAILURES FROM ' + tableName + '_failures AS A, STUDENTS AS B WHERE A.REGISTRATION_NUMBER=B.REGISTRATION_NUMBER AND CLASS="' + Department + '_' + Section + '" AND BATCH="' + Batch + '";' )
                const failures = parseInt( rows2[ 0 ][ 'FAILURES' ] )
                passPercent = (((total - failures) / total) * 100).toString()
            }
            if ( marksDTO.success ) {
                subjectAvg1 = { ...subjectAvg }
                passPercent2 = passPercent1
                const [ rows ] = await this.conn.execute( 'SELECT * FROM ' + tableName + '_arrear1' + ' T, students S WHERE T.REGISTRATION_NUMBER=S.REGISTRATION_NUMBER AND CLASS="' + Department + '_' + Section + '";' )
                if ( rows.length > 0 ) {
                    rows.forEach( item => {
                        const regNo = item[ 'Registration_Number' ]
                        marks[ regNo ].Credit += item.Credit
                        item[ 'GPA' ] = this.format( marks[ regNo ].Credit / totalCredits )
                        delete item[ 'Class' ]
                        delete item[ 'Batch' ]
                        delete item[ 'Registration_Number' ]
                        delete item[ 'Credit' ]
                        delete item[ 'Student_Name' ]
                        if ( marks1[ regNo ] == null ) {
                            marks1[ regNo ] = []
                        }
                        marks1[ regNo ].push( item )
                        if ( item[ 'Grade' ] != 'U' ) {
                            subjectAvg1[ item[ 'Subject_Code' ] ] += 1
                        }
                    } )
                    Object.keys( marks1 ).forEach( regNo => {
                        let pass = 1
                        marks1[ regNo ].forEach( sub => {
                            if ( sub.Grade === 'U' ) {
                                pass = 0
                            }
                        } )
                        passPercent2 += pass
                    } )
                }
                // console.log( passPercent2 )
            } else {
                marksDTO.success = false
            }
            if ( marksDTO.success ) {
                subjectAvg2 = { ...subjectAvg1 }
                passPercent3 = passPercent2
                const [ rows ] = await this.conn.execute( 'SELECT * FROM ' + tableName + '_arrear2' + ' T, students S WHERE T.REGISTRATION_NUMBER=S.REGISTRATION_NUMBER AND CLASS="' + Department + '_' + Section + '";' )
                if ( rows.length > 0 ) {
                    rows.forEach( item => {
                        const regNo = item[ 'Registration_Number' ]
                        marks[ regNo ].Credit += item.Credit
                        item[ 'GPA' ] = this.format( marks[ regNo ].Credit / totalCredits )
                        delete item[ 'Class' ]
                        delete item[ 'Batch' ]
                        delete item[ 'Registration_Number' ]
                        delete item[ 'Credit' ]
                        delete item[ 'Student_Name' ]
                        if ( marks2[ regNo ] == null ) {
                            marks2[ regNo ] = []
                        }
                        marks2[ regNo ].push( item )
                        if ( item[ 'Grade' ] != 'U' ) {
                            subjectAvg2[ item[ 'Subject_Code' ] ] += 1
                        }
                    } )
                    Object.keys( marks2 ).forEach( regNo => {
                        let pass = 1
                        marks2[ regNo ].forEach( sub => {
                            if ( sub.Grade === 'U' ) {
                                pass = 0
                            }
                        } )
                        passPercent3 += pass
                    } )
                }
                // console.log( passPercent3 )
            } else {
                marksDTO.success = false
            }
            if ( marksDTO.success ) {
                subjectAvg3 = { ...subjectAvg2 }
                passPercent4 = passPercent3
                const [ rows ] = await this.conn.execute( 'SELECT * FROM ' + tableName + '_arrear3' + ' T, students S WHERE T.REGISTRATION_NUMBER=S.REGISTRATION_NUMBER AND CLASS="' + Department + '_' + Section + '";' )
                if ( rows.length > 0 ) {
                    rows.forEach( item => {
                        const regNo = item[ 'Registration_Number' ]
                        marks[ regNo ].Credit += item.Credit
                        item[ 'GPA' ] = this.format( marks[ regNo ].Credit / totalCredits )
                        delete item[ 'Class' ]
                        delete item[ 'Batch' ]
                        delete item[ 'Registration_Number' ]
                        delete item[ 'Credit' ]
                        delete item[ 'Student_Name' ]
                        if ( marks3[ regNo ] == null ) {
                            marks3[ regNo ] = []
                        }
                        marks3[ regNo ].push( item )
                        if ( item[ 'Grade' ] != 'U' ) {
                            subjectAvg3[ item[ 'Subject_Code' ] ] += 1
                        }
                    } )
                    Object.keys( marks3 ).forEach( regNo => {
                        let pass = 1
                        marks3[ regNo ].forEach( sub => {
                            if ( sub.Grade === 'U' ) {
                                pass = 0
                            }
                        } )
                        passPercent4 += pass
                    } )
                }
                // console.log( passPercent4 )
            }
            subjects.forEach( subject => {
                subjectAvg[ subject ] = (((total - (total - subjectAvg[ subject ])) / total) * 100).toString()
                subjectAvg1[ subject ] = (((total - (total - subjectAvg1[ subject ])) / total) * 100).toString()
                subjectAvg2[ subject ] = (((total - (total - subjectAvg2[ subject ])) / total) * 100).toString()
                subjectAvg3[ subject ] = (((total - (total - subjectAvg3[ subject ])) / total) * 100).toString()
            } )
            passPercent1 = (((total - (total - passPercent1)) / total) * 100).toString()
            passPercent2 = (((total - (total - passPercent2)) / total) * 100).toString()
            passPercent3 = (((total - (total - passPercent3)) / total) * 100).toString()
            passPercent4 = (((total - (total - passPercent4)) / total) * 100).toString()
            marksDTO.marksData = {
                batch: Batch,
                department: Department,
                section: Section,
                semester: Semester,
                passPercent: passPercent,
                subjects: subjects,
                passPercent1: passPercent1,
                passPercent2: passPercent2,
                passPercent3: passPercent3,
                passPercent4: passPercent4,
                result: marks,
                arrear1: marks1,
                arrear2: marks2,
                arrear3: marks3,
                subjectPassPercent: subjectAvg,
                subjectPassPercent1: subjectAvg1,
                subjectPassPercent2: subjectAvg2,
                subjectPassPercent3: subjectAvg3
            }
        } catch ( err ) {
            // console.log( err )
            marksDTO.success = false
            marksDTO.description = err
            marksDTO.status = 500
            marksDTO.marksData = null
            logger.info( 'Exiting | MarksDao::getClassMarks | Error' )
            return marksDTO
        }

        marksDTO.success = true
        marksDTO.status = 200
        marksDTO.description = DATA_RETRIEVED_SUCCESSFULLY
        logger.info( "Exiting | MarksDao::getClassMarks" )
        return marksDTO
    }

    async findStudent ( regNum ) {
        logger.info( 'Entering | MarksDao::findStudent' )
        try {
            const [ rows ] = await this.conn.execute( 'SELECT Class, Batch FROM students WHERE Registration_Number=' + regNum )
            if ( rows.length > 0 ) {
                let data = rows[ 0 ]
                data.Class = data.Class.split( '_' )[ 0 ]
                logger.info( 'Exiting | MarksDao::findStudent' )
                return data
            } else {
                throw DATA_NOT_FOUND
            }
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

    format ( num ) {
        return parseInt( num * 1000 ) / 1000
    }

}

module.exports = MarksDao