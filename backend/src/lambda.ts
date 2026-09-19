import serverlessHttp from "serverless-http";
import { createApp } from "./app.js";

export const handler = serverlessHttp(createApp());
