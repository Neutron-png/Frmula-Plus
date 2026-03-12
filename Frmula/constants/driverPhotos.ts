const F1_MEDIA_BASE = "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers";

const DRIVER_PHOTO_PATHS: Record<string, string> = {
  norris: "L/LANNOR01_Lando_Norris/lannor01",
  max_verstappen: "M/MAXVER01_Max_Verstappen/maxver01",
  leclerc: "C/CHALEC01_Charles_Leclerc/chalec01",
  russell: "G/GEORUS01_George_Russell/georus01",
  hamilton: "L/LEWHAM01_Lewis_Hamilton/lewham01",
  piastri: "O/OSCPIA01_Oscar_Piastri/oscpia01",
  antonelli: "A/ANDANT01_Andrea_Kimi_Antonelli/andant01",
  alonso: "F/FERALO01_Fernando_Alonso/feralo01",
  sainz: "C/CARSAI01_Carlos_Sainz/carsai01",
  gasly: "P/PIEGAS01_Pierre_Gasly/piegas01",
  albon: "A/ALEALB01_Alexander_Albon/alealb01",
  ocon: "E/ESTOCO01_Esteban_Ocon/estoco01",
  stroll: "L/LANSTR01_Lance_Stroll/lanstr01",
  lawson: "L/LIALAW01_Liam_Lawson/lialaw01",
  hulkenberg: "N/NICHUL01_Nico_Hulkenberg/nichul01",
  bottas: "V/VALBOT01_Valtteri_Bottas/valbot01",
  bearman: "O/OLIBEA01_Oliver_Bearman/olibea01",
  bortoleto: "G/GABBOR01_Gabriel_Bortoleto/gabbor01",
  hadjar: "I/ISAHAD01_Isack_Hadjar/isahad01",
  perez: "S/SERPER01_Sergio_Perez/serper01",
  arvid_lindblad: "A/ARVLIN01_Arvid_Lindblad/arvlin01",
  colapinto: "F/FRACOL01_Franco_Colapinto/fracol01",
};

export function getDriverPhoto(driverId: string): { uri: string } | null {
  const path = DRIVER_PHOTO_PATHS[driverId];
  if (!path) return null;
  return { uri: `${F1_MEDIA_BASE}/${path}.png.transform/2col/image.png` };
}

export function getDriverPhotoHighRes(driverId: string): { uri: string } | null {
  const path = DRIVER_PHOTO_PATHS[driverId];
  if (!path) return null;
  return { uri: `${F1_MEDIA_BASE}/${path}.png.transform/4col/image.png` };
}

export function getDriverPhotoUrl(driverId: string): string | null {
  const path = DRIVER_PHOTO_PATHS[driverId];
  if (!path) return null;
  return `${F1_MEDIA_BASE}/${path}.png.transform/2col/image.png`;
}

export default DRIVER_PHOTO_PATHS;
