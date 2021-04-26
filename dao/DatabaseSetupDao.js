const conn = require( '../util/MysqlUtil' )
const mysql = require( 'sync-sql' )
const log4js = require( 'log4js' )

const logger = log4js.getLogger()
logger.level = 'info'

class DatabaseSetupDao {
    async createTables () {
        logger.info('Entering | DatabaseSetupDao::createTables')
        await mysql.mysql( conn, 'CREATE TABLE Students(Registration_Number DECIMAL(12,0) PRIMARY KEY,Student_Name VARCHAR(50) NOT NULL,Class VARCHAR(9) NOT NULL,Batch VARCHAR(9) NOT NULL)' )
        await mysql.mysql( conn, 'CREATE TABLE Subjects(Semester varchar(2) NOT NULL,Subject_Name varchar(90) NOT NULL,Subject_Code varchar(6) NOT NULL,Subject_Type varchar(1) NOT NULL,Department varchar(5) NOT NULL, Credits int(1) NOT NULL)' )
        await mysql.mysql( conn, 'CREATE TABLE Faculty(Faculty_Id varchar(6) NOT NULL,Faculty_Name varchar(30) NOT NULL,Subject_Code varchar(6) NOT NULL,Department varchar(5) NOT NULL,Batch varchar(9) NOT NULL,Semester int(1) NOT NULL,Section varchar(1) NOT NULL)' )
        logger.info('Entering | DatabaseSetupDao::createTables')
    }

    async insertSubjects ( data, dept ) {
        logger.info('Entering | DatabaseSetupDao::insertSubjects')
        let sem = 1
        await data.map( async row => {
            if ( row[ 'Subject' ] === 'b' ) {
                sem++
            } else {
                await mysql.mysql( conn, "INSERT INTO subjects VALUES('" + sem + "','" + row[ 'Subject' ] + "','" + row[ 'SubjectCode' ] + "','" + row[ 'SubjectType' ] + "','" + dept + "','" + row[ 'Credits' ] + "')" )
            }
        } )
        logger.info('Exiting | DatabaseSetupDao::insertSubjects')
    }
}

module.exports = DatabaseSetupDao