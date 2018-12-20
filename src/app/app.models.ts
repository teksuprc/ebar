
export class Tool {
    constructor(public name:string, public shortName:string, public classification:string, public desc:string, public links:any) {
        this.name = name;
        this.shortName = shortName;
        this.classification = classification;
        this.desc = desc;
        this.links = links;
    }
}

export class ToolLinks {
    constructor(public name:string, public url:string) {
        this.name = name;
        this.url = url;
    }
}

export interface ToolResponse {
    data: Array<Tool>;
}