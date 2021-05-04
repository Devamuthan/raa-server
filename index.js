const express = require( 'express' )
const log4js = require( 'log4js' )
const bodyParser = require( 'body-parser' )
const formidable = require( 'formidable' )
const DatabaseSetupController = require( './controller/DatabaseSetupController' )
const StudentController = require( './controller/StudentContoller' )
const MarksController = require( './controller/MarksController' )

const app = express()
const port = 5000
const logger = log4js.getLogger()
logger.level = 'info'

app.use( bodyParser.json() )
app.use( bodyParser.urlencoded( {
    extended: true
} ) )

app.get( '/', ( req, res ) => {
    logger.info( 'Get Request to /' )
    res.write( 'Get Request to /' )
    res.end()
} )

app.use( '/marks', MarksController )

app.use( '/students', StudentController )

app.use( '/database-setup', DatabaseSetupController )

app.use( ( req, res ) => {
    logger.info( '404 error... Page not found' )
    res.json( {
        status: '404',
        description: 'Page Not Found'
    } )
    res.end()
} )

app.listen( port, () => {
    logger.info( 'Server Available at port: ' + port )
} )