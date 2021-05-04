const mysql = require( 'mysql2/promise' )
const config = require( '../util/MysqlUtil' )
const log4js = require( 'log4js' )

const logger = log4js.getLogger()
logger.level = 'info'

const DATA_ADDED_SUCCESSFULLY = "Data Added Successfully";

class StudentDao {
    async addStudents ( studentDTO ) {
        logger.info( 'Entering | StudentDao::addStudents' )
        const data = studentDTO.studentData.data
        const conn = await mysql.createConnection( config )

        try {
            let tablePresent = false
            const [ rows ] = await conn.execute( 'SHOW TABLES' )
            rows.forEach( row => {
                if ( row[ 'Tables_in_raa' ] === (studentDTO.studentData.dept + '_' + studentDTO.studentData.batch.toString() + '_' + (studentDTO.studentData.batch + 4).toString() + '_S1').toLowerCase() ) {
                    tablePresent = true
                }
            } )
            if ( !tablePresent ) {

                for ( let sem = 1; sem <= 8; sem++ ) {
                    const tableName = studentDTO.studentData.dept + '_' + studentDTO.studentData.batch.toString() + '_' + (studentDTO.studentData.batch + 4).toString() + '_S' + sem.toString()

                    await conn.execute( "CREATE TABLE " + tableName + "(Registration_Number VARCHAR(12) PRIMARY KEY,Credit INT)" )
                    await conn.execute( "CREATE TABLE " + tableName + '_AfterRevaluation' + "(Registration_Number varchar(12),Subject_Code VARCHAR(6),Credit INT,Grade VARCHAR(2), PRIMARY KEY(Registration_Number,Subject_Code))" )
                    await conn.execute( "CREATE TABLE " + tableName + '_AfterReview' + "(Registration_Number VARCHAR(12),Subject_Code VARCHAR(6),Credit INT,Grade VARCHAR(2), PRIMARY KEY(Registration_Number,Subject_Code))" )
                    await conn.execute( "CREATE TABLE " + tableName + '_Arrear1' + "(Registration_Number VARCHAR(12),Subject_Code VARCHAR(6),Grade VARCHAR(2),Credit INT, PRIMARY KEY(Registration_Number,Subject_Code))" )
                    await conn.execute( "CREATE TABLE " + tableName + '_Arrear2' + "(Registration_Number VARCHAR(12),Subject_Code VARCHAR(6),Grade VARCHAR(2),Credit INT, PRIMARY KEY(Registration_Number,Subject_Code))" )
                    await conn.execute( "CREATE TABLE " + tableName + '_Arrear3' + "(Registration_Number VARCHAR(12),Subject_Code VARCHAR(6),Grade VARCHAR(2),Credit INT, PRIMARY KEY(Registration_Number,Subject_Code))" )
                    await conn.execute( "CREATE TABLE " + tableName + '_Failures' + "(Registration_Number VARCHAR(12),Subject_Code VARCHAR(6), PRIMARY KEY(Registration_Number,Subject_Code) )" )
                }
            }
            for ( let i in data ) {
                const row = data[ i ]
                const keys = Object.keys( row )
                const regNo = row[ keys[ 0 ] ]
                const name = row[ keys[ 1 ] ]
                const studClass = studentDTO.studentData.dept + '_' + row[ keys[ 2 ] ]
                const batch = studentDTO.studentData.batch.toString() + '_' + (studentDTO.studentData.batch + 4).toString()
                await conn.execute( "INSERT INTO students VALUES(" + regNo + ",'" + name + "','" + studClass + "','" + batch + "')" )
                for ( let sem = 1; sem <= 8; sem++ ) {
                    const tableName = studentDTO.studentData.dept + '_' + studentDTO.studentData.batch.toString() + '_' + (studentDTO.studentData.batch + 4).toString() + '_S' + sem.toString()
                    await conn.execute( "INSERT INTO " + tableName + "(Registration_Number) VALUES(" + regNo + ")" )
                }
            }
            studentDTO.success = true
        } catch
            ( err ) {
            studentDTO.success = false
            studentDTO.description = err
            studentDTO.status = 500
        }


        if ( studentDTO.success ) {
            studentDTO.status = 200
            studentDTO.description = DATA_ADDED_SUCCESSFULLY
        }
        studentDTO.studentData = null
        logger.info( 'Exiting | StudentDao::addStudents' )
        return studentDTO
    }
}

module.exports = StudentDao