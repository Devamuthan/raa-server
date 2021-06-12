class MarksDTO {
    constructor ( success, status, description, marksData ) {

        this._success = success;
        this._status = status;
        this._description = description;
        this._marksData = marksData;
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

    get marksData () {
        return this._marksData;
    }

    set marksData ( value ) {
        this._marksData = value;
    }

    get json () {
        return {
            success: this.success,
            status: this.status,
            description: this.description,
            marksData: this.marksData
        }
    }
}

module.exports = MarksDTO