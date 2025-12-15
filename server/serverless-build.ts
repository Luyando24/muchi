import serverlessHttp from "serverless-http";
import createServer from "./app.js";

export default serverlessHttp(createServer());
