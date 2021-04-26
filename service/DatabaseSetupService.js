const DatabaseSetupDao = require( '../dao/DatabaseSetupDao' )
const databaseSetupDao = new DatabaseSetupDao()
const fs = require( 'fs' ).promises
const parse = require( 'csv-parse/lib/sync' )
const path = require( 'path' )
const log4js = require('log4js')

const logger = log4js.getLogger()
logger.level = 'info'

class DatabaseSetupService {

    async setupDatabase () {
        logger.info('Entering | DatabaseSetupService::setupDatabase')
        await this.createTables()
        await this.insertSubjects()
        logger.info('Exiting | DatabaseSetupService::setupDatabase')
    }

    async createTables () {
        logger.info('Entering | DatabaseSetupService::createTables')
        await databaseSetupDao.createTables()
        logger.info('Entering | DatabaseSetupService::createTables')
    }

    async insertSubjects () {
        logger.info('Entering | DatabaseSetupService::insertSubjects')
        let dept = [ 'CSE', 'EEE', 'ECE', 'IT', 'EIE', 'MECH', 'CIVIL', 'AUTO' ]
        let rootDir = path.dirname( require.main.filename )
        await dept.map( async deptName => {
            const fileName = 'R17' + deptName + '.csv'
            const fileContent = await fs.readFile( rootDir + '\\source\\subjects\\' + fileName );
            const records = parse( fileContent, { columns: true } )
            await databaseSetupDao.insertSubjects(records, deptName)
        } )
        logger.info('Exiting | DatabaseSetupService::insertSubjects')
    }
}

module.exports = DatabaseSetupService