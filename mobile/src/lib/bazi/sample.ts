import { BirthInput } from './index';

/**
 * Default field values on the 02 정보입력 screen, and the profile "먼저
 * 둘러보기" (guest) opens straight into per the handoff §4 note for 01·02:
 * guest browsing uses a sample chart to unlock 03/04 immediately, saving
 * and QnA are what prompt a real login.
 */
export const SAMPLE_BIRTH_INPUT: BirthInput = {
  date: '1997-03-21',
  time: '05:30',
  calendar: 'solar',
  region: '서울',
  gender: 'female',
};
