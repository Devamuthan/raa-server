const Tabula = require( '../util/tabula-js/tabula' );
const log4js = require( 'log4js' )
const MarksDao = require( '../dao/MarksDao' )

const logger = log4js.getLogger()
logger.level = 'info'
const marksDao = new MarksDao()

class MarksService {
    async addMarks ( file, fields, marksDTO ) {
        logger.info( 'Entering | MarksService::addMarks' )
        const data = await this.extractData( file.path )
        if ( data.error !== '' ) {
            marksDTO.success = false
            marksDTO.description = data.error
        }
        let newData = data.output.split( "\n" )
        marksDTO.marksData = {
            data: newData,
            type: fields.type
        }
        if ( marksDTO.success ) {
            marksDTO = marksDao.addMarks( marksDTO )
        }
        logger.info( 'Exiting | MarksService::addMarks' )
        return marksDTO
    }

    async getIndividualMarks ( RegNum, marksDTO ) {
        logger.info( 'Entering | MarksService::getIndividualMarks' )
        if ( RegNum === '' || RegNum === null ) {
            marksDTO.success = false
            marksDTO.description = "Registration Number is Empty"
            marksDTO.status = 500
        }
        if ( marksDTO.success ) {
            marksDTO = marksDao.getIndividualMarks( RegNum, marksDTO )
        }
        logger.info( 'Exiting | MarksService::getIndividualMarks' )
        return marksDTO
    }

    async extractData ( fileName ) {
        const tabulaConfig = {
            pages: 'all',
            guess: true
        }
        const table = new Tabula( fileName, tabulaConfig )
        return await table.getData();
    }
}

module.exports = MarksService