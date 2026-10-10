require('stack.js');
const stack = new Stack();
const ret = new Stack();
const CPUSIZE = 1048576;
const RAM = new Uint16Array(CPUSIZE / 2);
const ROM = new Uint16Array(CPUSIZE/2);
let PC = 0;
let ins = ROM[PC];
const regs = new Uint16Array(32);
const u = void 0;
let Op;
function b(num, n) {
  return (num >> n) & 1;
}
function B(num = Op, start = 0, end = 4) {
  let result = 0;
  let position = 0;

  for (let i = start; i <= end; i++) {
    let bit = b(num, i); 
    result |= (bit << position); 
    position++;
  }

  return result;
}
let zf = 0, nf = 0, cf = 0;
function ALU(op) {
    Op = op; // Sync global state for shortcuts
    
    // Cache the register contents for high-speed evaluations
    let valA = B(u, u, u); // Bits 4-0
    let valB = B(u, 5, 9); // Bits 9-5

    switch(B(u, 10, 14)) {
        // ------------------------------------------
        // 16 ARITHMETIC OPERATIONS (0b00000 - 0b01111)
        // ------------------------------------------
        case 0b00000: return valA + valB;              // 0. ADD
        case 0b00001: return valA - valB;              // 1. SUB
        case 0b00010: return valA * valB;              // 2. MUL
        case 0b00011: return valA / valB;              // 3. DIV
        case 0b00100: return valA % valB;              // 4. MOD (Modulo)
        case 0b00101: return valA + 1;                 // 5. INC A
        case 0b00110: return valA - 1;                 // 6. DEC A
        case 0b00111: return Math.abs(valA);           // 7. ABS (Absolute Value)
        case 0b01000: return -valA;                    // 8. NEG (Negate / 2's Complement)
        case 0b01001: return valB + 1;                 // 9. INC B
        case 0b01010: return valB - 1;                 // 10. DEC B
        case 0b01011: return valB - valA;              // 11. SUBR (Reverse Subtract)
        case 0b01100: return valB / valA;              // 12. DIVR (Reverse Divide)
        case 0b01101: return Math.min(valA, valB);     // 13. MIN
        case 0b01110: return Math.max(valA, valB);     // 14. MAX
        case 0b01111: return 0;                        // 15. CLR (Zero Out)

        // ------------------------------------------
        // 16 LOGICAL & BITWISE OPERATIONS (0b10000 - 0b11111)
        // ------------------------------------------
        case 0b10000: return valA & valB;              // 16. AND
        case 0b10001: return valA | valB;              // 17. OR
        case 0b10010: return valA ^ valB;              // 18. XOR
        case 0b10011: return ~valA;                    // 19. NOT A
        case 0b10100: return ~(valA & valB);            // 20. NAND
        case 0b10101: return ~(valA | valB);            // 21. NOR
        case 0b10110: return ~(valA ^ valB);            // 22. XNOR
        case 0b10111: return valA << valB;             // 23. LSH (Logical Left Shift)
        case 0b11000: return valA >> valB;             // 24. RSH (Arithmetic Right Shift)
        case 0b11001: return valA >>> valB;            // 25. URSH (Unsigned Right Shift)
        case 0b11010: return ~valB;                    // 26. NOT B
        
        case 0b11011: // 27. CMP (Compare) -> Linux-style flags assignment
            let diff = valA - valB;
            zf = (diff === 0) ? 1 : 0;
            nf = (diff < 0) ? 1 : 0;
            cf = (valA < valB) ? 1 : 0; // Unsigned borrow bit
            return diff; 

        case 0b11100: // 28. LRL (Left Roll / Rotate Left)
            let rotL = valB & 31; // Clamp to 32-bit width boundaries
            return (valA << rotL) | (valA >>> (32 - rotL));

        case 0b11101: // 29. RRL (Right Roll / Rotate Right)
            let rotR = valB & 31;
            return (valA >>> rotR) | (valA << (32 - rotR));

        case 0b11110: return valA;                     // 30. PASS A
        case 0b11111: return valB;                     // 31. PASS B

        default: throw new Error("Invalid ALU operation");
    }
}

function data(op){
  Op = B(op,0,14);
  switch(Op){
    case 0b00000: return; // NOP
    case 0b00001: regs[B(op,5,9)] = B(op,4,0); break; // MOVREGS
    case 0b00010: ins = B(op,4,0); break; // JMP
    case 0b00011: if(zf)ins = B(op,4,0); break; // JZ
    case 0b00100: if(!zf)ins = B(op,4,0); break; // JNZ
    case 0b00101: if(cf)ins = B(op,4,0); break; // JC
    case 0b00110: if(!cf)ins = B(op,4,0); break; // JNC
    case 0b00111: if(nf)ins = B(op,4,0); break; // JN
    case 0b01000: if(!nf)ins = B(op,4,0); break; // JNN
    case 0b01001: regs[B(op,5,9)] = RAM[B(op,4,0)]; break; // LOADRAM
    case 0b01010: RAM[B(op,4,0)] = regs[B(op,5,9)]; break; // STORERAM
    case 0b01011: stack.push(PC); break; // Label
    case 0b01100: PC = stack.pop(); break; // Return
    case 0b01101: ret.push(PC);ins = PC;break; // Call
    case 0b01110: PC = ret.pop(); break; // Return from Call
    case 0b01111: stack.push(B(op,4,0)); break; // Push
    case 0b10000: stack.pop(); break; // Pop
    case 0b10001: stack.top(); break; // Peek
    case 0b10010: regs[B(op,5,9)] = stack.pop(); break; // Pop to Register
    case 0b10011: regs[B(op,5,9)] = stack.empty(); break; // Empty? to register
    case 0b10100: RAM[B(op,5,9)] = B(op,4,0); break; // LOADIMM
    default: throw new Error("Invalid data operation");
  }
}

function execute(op) {
  if(b(op,15) === 0) {data(op);}else{ALU(op);}
}

// Assuming RAM array is 256 slots long
const RAM_SIZE = 256;
const RAM = new Array(RAM_SIZE).fill(0);

function renderDisplay() {
    let displayStartIndex = RAM_SIZE - 16; // Index 240
    let displayString = "🖥️ [RAM DISPLAY VRAM]\n-----------------------\n";

    for (let i = 0; i < 16; i++) {
        let ramAddress = displayStartIndex + i;
        let value = RAM[ramAddress];
        
        // Turn values into tiny visual grids or characters! 
        // For example, if value > 0 draw a solid box, otherwise an empty box
        let visualPixel = value > 0 ? "■ " : "□ ";
        displayString += visualPixel;

        // Break into a clean 4x4 grid layout
        if ((i + 1) % 4 === 0) displayString += "\n";
    }
    
    console.clear(); // Keeps the display static in your terminal/console
    console.log(displayString);
}
