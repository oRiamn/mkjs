// Ghidra post-script: locate MKDS map-object ID references in ARM9.
// @category MKDS

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.Listing;
import ghidra.program.model.scalar.Scalar;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceManager;

public class FindMkdsObjectIds extends GhidraScript {

	private static final int[] TARGET_IDS = { 0x2, 0xf, 0x67, 0x1af };
	private static final String[] TARGET_STRINGS = {
		"Psea", "woodbox", "fireball", "puddle", "water_efct", "bk_wave", "hyudoro"
	};

	@Override
	public void run() throws Exception {
		println("=== MKDS object string search ===");
		for (String needle : TARGET_STRINGS) {
			Address found = find(needle);
			if (found != null) {
				println(String.format("STRING %-16s @ %s", needle, found));
				showRefs(found);
			}
		}

		println("");
		println("=== CMP/TST with target object IDs ===");
		Listing listing = currentProgram.getListing();
		Instruction ins = listing.getInstructions(currentProgram.getMinAddress(), true).next();
		while (ins != null) {
			String mnemonic = ins.getMnemonicString();
			if (mnemonic.startsWith("cmp") || mnemonic.startsWith("tst")) {
				for (int op = 0; op < ins.getNumOperands(); op++) {
					Object[] objs = ins.getOpObjects(op);
					for (Object obj : objs) {
						if (obj instanceof Scalar) {
							long val = ((Scalar) obj).getUnsignedValue();
							for (int id : TARGET_IDS) {
								if (val == id) {
									println(String.format("ID 0x%04x @ %s  %s", id, ins.getAddress(), ins));
								}
							}
						}
					}
				}
			}
			ins = ins.getNext();
		}
	}

	private void showRefs(Address addr) throws Exception {
		ReferenceManager refMgr = currentProgram.getReferenceManager();
		for (Reference ref : refMgr.getReferencesTo(addr)) {
			Instruction from = currentProgram.getListing().getInstructionAt(ref.getFromAddress());
			if (from != null) {
				println("  xref -> " + from.getAddress() + "  " + from);
			}
		}
	}
}
