import serverlessHttp from "serverless-http";
import createServer from "./index.js";

export default serverlessHttp(createServer());
