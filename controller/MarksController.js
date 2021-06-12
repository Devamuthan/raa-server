const express = require( 'express' )
const router = express.Router()
const log4js = require( 'log4js' )
const bodyParser = require( 'body-parser' )
const MarksDT0 = require( '../dto/MarksDTO' )
const MarksService = require( '../service/MarksService' )
const formidable = require( 'formidable' )
const cors = require( 'cors' )

const logger = log4js.getLogger()
logger.level = 'info'
const marksService = new MarksService()

router.use( bodyParser.json() )
router.use( bodyParser.urlencoded( { extended: false } ) )

let corsConfig = { /*origin: 'http://127.0.0.1:3000/marks'*/ }

router.use( cors( corsConfig ) )

router.post( '/', ( req, res ) => addMarks( req, res ) )

router.get( '/', ( req, res ) => getIndividualMarks( req, res ) )

router.get( '/class', ( req, res ) => getClassMarks( req, res ) )

const addMarks = async ( req, res ) => {
    logger.info( 'Entering | MarksController::addMarks' )
    let marksDTO = new MarksDT0( true, null, '', null )
    let form = new formidable.IncomingForm()
    await form.parse( req, async function ( err, fields, files ) {
        if ( err ) {
            marksDTO.success = false
            marksDTO.description = err
        }
        if ( marksDTO.success ) {
            marksDTO = await marksService.addMarks( files.file, fields, marksDTO )
        }
        res.json( marksDTO.json )
        logger.info( 'Exiting | MarksController::addMarks' )
        res.end()
    } )
}

const getIndividualMarks = async ( req, res ) => {
    logger.info( "Entering | MarksController::getIndividualMarks" )
    let marksDTO = new MarksDT0( true, null, '', null )
    const RegNum = req.query.RegNum
    marksDTO = await marksService.getIndividualMarks( RegNum, marksDTO )
    res.json( marksDTO.json )
    logger.info( "Exiting | MarksController::getIndividualMarks" )
    res.end()
}

const getClassMarks = async ( req, res ) => {
    logger.info( "Entering | MarksController::getClassMarks" )
    let marksDTO = new MarksDT0( true, null, '', null )
    const Batch = req.query.Batch
    const Department = req.query.Department
    const Section = req.query.Section
    const Semester = req.query.Semester
    marksDTO = await marksService.getClassMarks( Batch, Department, Section, Semester, marksDTO )
    res.json( marksDTO.json )
    res.end()
    logger.info( "Exiting | MarksController::getClassMarks" )
}

module.exports = router