import { Location } from "./parsing/Token";

export type Metadata = {
  type: "parse";
  location: Location;
};

export class IndigoError extends Error {
  readonly metadata: Metadata;

  constructor(message: string, metadata: Metadata) {
    if (metadata.type === "parse") {
      message =
        metadata.location.row + ":" + metadata.location.column + ": " + message;
    }
    super(message);
    this.metadata = metadata;
  }
}
