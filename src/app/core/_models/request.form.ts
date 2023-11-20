// not finished

export class RequestFormData {
    public requestType?: string = '';
    public name?: string = '';
    public details?: string = '';
    public attachment?: string = ''; // todo
    public resourceType?: string = '';
    public resourceName?: string = '';

    public liveresourcename?: string = '';

    fromApiModel(data: any) {
        this.requestType = data.requestType;
        this.name = data.name;
        this.details = data.details;
        this.attachment = data.attachment;

        // mapped
        this.resourceName = data.resourceId?._id
        this.resourceType = data.resourceTypeId

        return this;
    }
}
