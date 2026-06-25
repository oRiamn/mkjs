import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const EXTRACT_DIR = "test/nds-extract/out";
export const EXTRACT_DATA_DIR = path.join(EXTRACT_DIR, "data", "data");
export const OBJECT_ID_REPORT_PATH = path.join(EXTRACT_DIR, "object-id-report.json");

export const extractExists = existsSync(EXTRACT_DATA_DIR);
export const objectIdReportExists = existsSync(OBJECT_ID_REPORT_PATH);

export type ObjectIdReport = {
	generatedAt: string;
	extractDir: string;
	mapObjAssets: string[];
	grpconfEntryCount: number;
	objiUniqueIds: number;
	unmappedInObjDatabase: string[];
	objects: {
		id: number;
		hex: string;
		mkjsClass: string | null;
		inObjDatabase: boolean;
		usageCount: number;
		courses: string[];
	}[];
};

/** Read a ROM path (e.g. `/data/Course/beach_course.carc`) from the ndstool-style extract tree. */
export function readExtractedFile(romPath: string): ArrayBuffer {
	const rel = romPath.replace(/^\/data\//, "");
	const filePath = path.join(EXTRACT_DATA_DIR, rel);
	const buffer = readFileSync(filePath);
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export function loadObjectIdReport(): ObjectIdReport {
	return JSON.parse(readFileSync(OBJECT_ID_REPORT_PATH, "utf8")) as ObjectIdReport;
}
