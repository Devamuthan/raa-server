class StudentDTO{
    constructor (success, status, description, studentData) {
        this._success = success;
        this._status = status;
        this._description = description;
        this._studentData = studentData;
    }

    get success () {
        return this._success;
    }

    set success ( value ) {
        this._success = value;
    }

    get status () {
        return this._status;
    }

    set status ( value ) {
        this._status = value;
    }

    get description () {
        return this._description;
    }

    set description ( value ) {
        this._description = value;
    }

    get studentData () {
        return this._studentData;
    }

    set studentData ( value ) {
        this._studentData = value;
    }

    get json(){
        return {
            success: this.success,
            status: this.status,
            description: this.description,
            studentData: this.studentData
        }
    }
}

module.exports = StudentDTO