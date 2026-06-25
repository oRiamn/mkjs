import { ObjDecor } from "../objDecor";

/** GCN palm tree (0x0136). Retail ROM omits donkytree2GC.nsbmd; courseScene aliases it to CrossTree1.nsbmd. */
export class DonkyTree2 extends ObjDecor {
	requireRes() {
		return { mdl: [{ nsbmd: "donkytree2GC.nsbmd" }] };
	}
}
