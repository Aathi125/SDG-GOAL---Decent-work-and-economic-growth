/**
 * Must be imported before any file that calls mongoose.model().
 * Otherwise schemas keep bufferCommands: true and queries buffer 10s when DB is down.
 */
import mongoose from "mongoose";

mongoose.set("bufferCommands", false);
