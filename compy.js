const CPUSIZE = 1048576
let RAM = new Uint16Array(CPUSIZE / 2)
let ROM = new Uint16Array(CPUSIZE/2)
let PC = 0
let ins = ROM[PC]
let Regs = {
    RA: 0,
    RB: 0,
    RC: 0,
    RD: 0,
    RE: 0,
    RF: 0
}
function AU