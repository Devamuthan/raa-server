const fs = require('fs').promises
const parse = require('csv-parse/lib/sync')
const StudentDao = require('../dao/StudentDao')
const log4js = require('log4js')

const studentDao = new StudentDao()
const logger = log4js.getLogger()
logger.level = 'info'

class StudentService{
    async addStudents(file, fields, studentDTO){
        logger.info('Entering | StudentService::addStudents')
        let records
        if(fields.type === 'department'){
            const fileContent = await fs.readFile(file.path)
            records = await parse(fileContent, {
                columns: true,
                skip_empty_lines: true
            })
            studentDTO.studentData = {
                data: records,
                dept: fields.dept,
                batch : parseInt(fields.batch)
            }
            studentDTO = await studentDao.addStudents(studentDTO)
        }
        logger.info('Exiting | StudentService::addStudents')
        return studentDTO
    }
}

module.exports = StudentService