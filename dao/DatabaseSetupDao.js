const config = require( '../util/MysqlUtil' )
// const mysql = require( 'sync-sql' )
const mysql = require( 'mysql2/promise' )
const log4js = require( 'log4js' )


const logger = log4js.getLogger()
logger.level = 'info'

class DatabaseSetupDao {

    async createTables () {
        logger.info( 'Entering | DatabaseSetupDao::createTables' )
        try {
            const conn = await mysql.createConnection( config )

            await conn.execute( 'CREATE TABLE Students(Registration_Number DECIMAL(12,0) PRIMARY KEY,Student_Name VARCHAR(50) NOT NULL,Class VARCHAR(9) NOT NULL,Batch VARCHAR(9) NOT NULL)' )
            await conn.execute( 'CREATE TABLE Subjects(Semester varchar(2) NOT NULL,Subject_Name varchar(90) NOT NULL,Subject_Code varchar(6) NOT NULL,Subject_Type varchar(1) NOT NULL,Department varchar(5) NOT NULL, Credits int(1) NOT NULL)' )
            await conn.execute( 'CREATE TABLE Faculty(Faculty_Id varchar(6) NOT NULL,Faculty_Name varchar(30) NOT NULL,Subject_Code varchar(6) NOT NULL,Department varchar(5) NOT NULL,Batch varchar(9) NOT NULL,Semester int(1) NOT NULL,Section varchar(1) NOT NULL)' )
        } catch ( err ) {
            console.log( err )
        }
        logger.info( 'Entering | DatabaseSetupDao::createTables' )
    }

    async insertSubjects ( data, dept ) {
        logger.info( 'Entering | DatabaseSetupDao::insertSubjects' )
        const conn = await mysql.createConnection( config )
        let sem = 1
        await data.map( async row => {
            if ( row[ 'Subject' ] === 'b' ) {
                sem++
            } else {
                let query = "INSERT INTO subjects VALUES('" + sem + "','" + row[ 'Subject' ].trim() + "','" + row[ 'SubjectCode' ].trim() + "','" + row[ 'SubjectType' ].trim() + "','" + dept.trim() + "','" + parseInt( row[ 'Credits' ] ) + "')"
                try {
                    await conn.execute( query )
                } catch ( err ) {
                    console.log( err )
                    console.log( query )
                }
            }
        } )


        logger.info( 'Exiting | DatabaseSetupDao::insertSubjects' )
    }
}

module.exports = DatabaseSetupDao