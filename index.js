const express = require( 'express' )
const log4js = require( 'log4js' )
const bodyParser = require( 'body-parser' )
const formidable = require( 'formidable' )
const Tabula = require( './util/tabula-js/tabula' );
const DatabaseSetupController = require('./controller/DatabaseSetupController')

const app = express()
const logger = log4js.getLogger()
const port = 5000

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

app.post( '/', async ( req, res ) => {
    logger.info( 'Post Request to /' )
    let form = new formidable.IncomingForm()
    form.parse( req, async function ( err, fields, files ) {
        if(err){
            console.log( err )
            res.end(err)
        }

        res.end()
    } )
} )

app.use('/database-setup', DatabaseSetupController)


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

// const extractData = async ( fileName ) => {
//     const tabulaConfig = {
//         pages: 'all',
//         guess: true
//     }
//     const table = new Tabula( fileName, tabulaConfig )
//     return await table.getData();
// }

// const data = await extractData(files.file.path)
// res.write('File Converted to data')
// if ( data.error !== '' ) {
//     console.log( data.error )
//     res.end(data.error)
// }
// let re = /([1-9])([0-9]{11})(,)/
// let newData = data.output.split( "\n" )
// newData = newData.filter( val => {
//     if ( re.test( val ) ) {
//         return (val)
//     } else {
//         console.log( val )
//     }
// } )
// console.log( "\n Above are filtered out \n" )
// newData.map( val => {
//     console.log( val )
// } )