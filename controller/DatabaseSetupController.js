const express = require( 'express' )
const router = express.Router()
const bodyParser = require( 'body-parser' )
const log4js = require( 'log4js' )
const DatabaseSetupService = require('../service/DatabaseSetupService')

const logger = log4js.getLogger()
logger.level = 'info'

const databaseSetupService =new DatabaseSetupService()

router.use( bodyParser.json() )
router.use( bodyParser.urlencoded( { extended: false } ) )

router.post( '/', async ( req, res ) => await setupDatabase(req, res) )

const setupDatabase = async (req, res) => {
    logger.info('Entering | DatabaseSetupController::setupDatabase')
    await databaseSetupService.setupDatabase()
    logger.info('Exiting | DatabaseSetupController::setupDatabase')
    res.end()
}

module.exports = router