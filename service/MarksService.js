const Tabula = require( '../util/tabula-js/tabula' );
const log4js = require( 'log4js' )
const MarksDao = require( '../dao/MarksDao' )

const logger = log4js.getLogger()
logger.level = 'info'
const marksDao = new MarksDao()

const REGISTRATION_NUMBER_IS_EMPTY = "Registration Number is Empty";

const BATCH_IS_EMPTY = "Batch is Empty";

const DEPARTMENT_IS_EMPTY = "Department is Empty";

const SECTION_IS_EMPTY = "Section is Empty";

const SEMESTER_IS_EMPTY = 'Semester is Empty';

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
        if ( RegNum === '' || RegNum == null ) {
            marksDTO.success = false
            marksDTO.description = REGISTRATION_NUMBER_IS_EMPTY
            marksDTO.status = 500
        }
        if ( marksDTO.success ) {
            marksDTO = marksDao.getIndividualMarks( RegNum, marksDTO )
        }
        logger.info( 'Exiting | MarksService::getIndividualMarks' )
        return marksDTO
    }

    async getClassMarks ( Batch, Department, Section, Semester, marksDTO ) {
        logger.info( 'Entering | MarksService::getClassMarks' )
        if ( Batch === '' || Batch == null ) {
            marksDTO.success = false
            marksDTO.description = BATCH_IS_EMPTY
            marksDTO.status = 500
        }
        if ( Department === '' || Department == null ) {
            marksDTO.success = false
            marksDTO.description += ' ' + DEPARTMENT_IS_EMPTY
            marksDTO.status = 500
        }
        if ( Section === '' || Section == null ) {
            marksDTO.success = false
            marksDTO.description += ' ' + SECTION_IS_EMPTY
            marksDTO.status = 500
        }
        if ( Semester === '' || Semester == null ) {
            marksDTO.success = false
            marksDTO.description += ' ' + SEMESTER_IS_EMPTY
            marksDTO.status = 500
        }
        if ( marksDTO.success ) {
            marksDTO = marksDao.getClassMarks( Batch, Department, Section, Semester, marksDTO )
        }
        logger.info( 'Exiting | MarksService::getClassMarks' )
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