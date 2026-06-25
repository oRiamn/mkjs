import { ObjDecor } from "../objDecor";

/** GCN palm tree (0x0136). Retail ROM never shipped donkytree2GC.nsbmd. */
export class DonkyTree2 extends ObjDecor {
	requireRes() {
		return { mdl: [] as { nsbmd: string }[] };
	}
}
