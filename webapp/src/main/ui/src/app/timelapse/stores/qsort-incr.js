// Sort a sequence of Stealth "bin" records within a typed array.
//
// vi32  - Int32Array of raw storage
// vf64  - Float64Array of raw storage (used for faster memory moves)
// si32  - Int32Array of raw storage used for stack of (b,e) tuples
//         This array should have space for at least log2(N) (b,e) entries.
//         Since the max N is 2^32, the stack should be at least 32 * 2 * 4
//         = 256 bytes.
// spI32 - Pointer to just beyond the last entry in the stack.
// koI32 - sort key offset within record in units of Int32 (4-bytes)
// szF64 - size of a record in units of Float64 (8-bytes)
//
// To sort a sequence [b,e), "push" b and e on the stack then call this
// function:
//
// si32[0] = b; si32[1] = e;
// sortBinRec ( ..., si32,2, ...);
//
// Supply an optional completion function and argument to be invoked when
// the sort is done.
//
// completionFunc - function to invoke when sort is done
// completionArg  - argument to completionFunc
//
// Return
//       - current stack pointer or 0 if the sort is complete.
//         This value should be repeatedly passed back to this function as
//         spI32 until the function returns 0.
//
function sortBinRec (vi32,vf64,si32,spI32,koI32,szF64,
						completionFunc,completionArg)
{
	spI32 = spI32|0;
	koI32 = koI32|0;
	szF64 = szF64|0;

	// declare all variables are their type (I32 or F64)
	var b=0, e=0, p=0;		// current record index; usually one-to-one with ip
	var szI32=0;			// size of a record in units of Int32 (4-bytes)

	var ib=0, ie=0, ip=0, iq=0;	// I32 indices: begin, end, current pos

	var vb=0, vm=0, ve=0;	// keys associated with ib,ie, and middle/pivot
	var n=0;				// scratch value

	var f1=0, f2=0;			// F64 indices used for data movement
	var tmp=+0.0;			// 64-bit value used for data movement
	var tStart=0.0;

	tStart = Date.now();

	if ( (spI32|0) <= 1 ) {	// spI32 is 0, 2, 4, ...
		completionFunc(completionArg);
		return;
	}

	// Pop b,e off stack
	spI32 = (spI32-1)|0;
	e = si32[spI32|0]|0;
	spI32 = (spI32-1)|0;
	b = si32[spI32|0]|0;

	szI32 = (szF64<<1)|0;

	for (;;) {
		// sort current [b,e)

		// convert to I32 key offsets
		ib = ((b*szI32)+koI32)|0;
		ie = ((e*szI32)+koI32)|0;

		n = (e-b)|0;

		if ( (n|0) <= 2 ) {	// GNU C++ stdlib use 16
			// trivial sort
			// do we need to swap or are we good-to-go as is?
			if ( (n|0) > 1 && (vi32[ib|0]|0) > (vi32[(ib+szI32)]|0) ) {
				// swap(ib,ib+1)
				f1 = ((ib-koI32)>>1)|0;
				f2 = (f1+szF64)|0;
				for (n = szF64|0; (n|0) != (0|0); n=(n-1)|0, f1=(f1+1)|0, f2=(f2+1)|0 ) {
					tmp = vf64[f1|0]; vf64[f1|0]=vf64[f2|0]; vf64[f2|0]=tmp;
				}
			}
			if ( (spI32|0) <= 1 ) {
				completionFunc(completionArg);
				return;			// ########## Finished! ##########
			}

			// Pop b,e off stack
			spI32 = (spI32-1)|0;
			e = si32[spI32|0]|0;
			spI32 = (spI32-1)|0;
			b = si32[spI32|0]|0;

		} else {

			// Ref: C++ std::sort

			// pivot = vm = median of first, middle, last

			ip = (ib + (((e-b)>>1)|0)*szI32)|0;	// middle
			vb = vi32[ib|0]|0;
			vm = vi32[ip|0]|0;
			ve = vi32[(ie-szI32)|0]|0;

			if ( (vb|0) < (vm|0) ) {
				if ( (vm|0) < (ve|0) ) {
					// use vm
				} else if ( (vb|0) < (ve|0) ) {
					vm = ve;
				} else {
					vm = vb;
				}
			} else {
				if ( (vb|0) < (ve|0) ) {
					vm = vb;
				} else if ( (vm|0) < (ve|0) ) {
					vm = ve;
				} else {
					// use vm; SWAP(ip,ie)
				}
			}

			// p = partition [b,e) around vm

			p = b|0;
			ip = ib|0;
			iq = ie|0;

			for (;;) {

				while ( (vi32[ip|0]|0) < (vm|0) ) {
					ip = (ip+szI32)|0;
					p = (p+1)|0;
				}
				iq = (iq-szI32)|0;
				while ( (vm|0) < (vi32[iq|0]|0) ) {
					iq = (iq-szI32)|0;
				}
				if ( (ip|0) >= (iq|0) ) {
					break;
				}

				// swap(ip,iq)
				// As an optimization for some use cases and because the
				// comparison is cheap, add a condition to avoid gratuitously
				// swapping identical values.
				if ( (vi32[ip|0]|0) != (vi32[iq|0]|0) ) {
					f1 = ((ip-koI32)>>1)|0;
					f2 = ((iq-koI32)>>1)|0;
					for (n=szF64|0; (n|0) != (0|0); n=(n-1)|0, f1=(f1+1)|0, f2=(f2+1)|0 ) {
						tmp = vf64[f1|0]; vf64[f1|0]=vf64[f2|0]; vf64[f2|0]=tmp;
					}
				}
				ip = (ip+szI32)|0;
				p = (p+1)|0;
			}

			// The parition is complete; now we need to sort [b,p) and [p,e).
			//
			// Push the smaller range on our call stack and proceed to sort
			// the larger one.
			//
			// Pushing the smaller one ensures that the call stack size
			// won't exceed log2(N).

			if ( ((ip-ib)|0) < ((ie-ip)|0) ) {
				// push smaller range [b,p)
				si32[spI32|0] = b|0;
				spI32 = (spI32+1)|0;
				si32[spI32|0] = p|0;
				spI32 = (spI32+1)|0;
				// prepare to process larger range [p,e)
				b = p;
			} else {
				// push smaller range [p,e)
				si32[spI32|0] = p|0;
				spI32 = (spI32+1)|0;
				si32[spI32|0] = e|0;
				spI32 = (spI32+1)|0;
				// prepare to process larger range [b,p)
				e = p;
			}

			// Should we press on or give control back to the browser?

			// Calling Date.now() is expensive so try not to do it very often.
			if ( ((e-b)|0) > 50000 ) {
				// Relinquishing control is *very* expensive so don't do it
				// unless we getting close to human-perceptible times (50ms).
				if ( (Date.now() - tStart) > 50 ) {
					// push [b,e) and resume processing later
					si32[spI32|0] = b|0;
					spI32 = (spI32+1)|0;
					si32[spI32|0] = e|0;
					spI32 = (spI32+1)|0;
					setTimeout(sortBinRec,0,vi32,vf64,si32,spI32,koI32,szF64,
								completionFunc,completionArg);
					return spI32|0;
				}
			}
		}
	}
}
