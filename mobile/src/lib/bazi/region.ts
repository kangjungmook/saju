/** Longitude table for the region picker on screen 02 (§3 step 1: 진태양시 보정, 지역 경도 기준). */
export const KR_REGIONS: Record<string, number> = {
  서울: 126.978,
  인천: 126.705,
  수원: 127.028,
  춘천: 127.730,
  청주: 127.489,
  대전: 127.385,
  전주: 127.148,
  광주: 126.852,
  대구: 128.601,
  부산: 129.075,
  울산: 129.311,
  창원: 128.681,
  제주: 126.532,
};

const STANDARD_MERIDIAN_DEG = 135; // KST reference meridian (UTC+9)

/** Minutes to add to clock time to get true solar time — negative west of the standard meridian. */
export function trueSolarAdjustmentMin(regionLongitudeDeg: number): number {
  return Math.round((regionLongitudeDeg - STANDARD_MERIDIAN_DEG) * 4);
}
