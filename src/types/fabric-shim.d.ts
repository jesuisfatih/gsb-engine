// src/types/fabric-shim.d.ts
declare module 'fabric' {
  // En azından default + named export'u sağla
  const fabric: any
  export { fabric }
  export default fabric
}
