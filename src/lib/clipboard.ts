import { Platform, Share } from 'react-native';

/**
 * Handing a block of text to the person, on whatever platform they are on.
 *
 * The app did this through `navigator.clipboard?.writeText` for a year,
 * which is correct on the web and does nothing at all in React Native:
 * there is a `navigator`, it has no `clipboard`, and the optional chain
 * turns that into a resolved promise. Both callers then said "copied"
 * about a copy that never happened — the one lie the Library's own test
 * exists to prevent, told on native by every press.
 *
 * The obvious fix was `expo-clipboard`, and it was tried: installed,
 * pods installed, provider regenerated, clean build. `-lExpoClipboard`
 * ends up in the link command, `ExpoModulesProvider.swift` registers
 * `ClipboardModule.self`, and the class symbol is in the installed
 * binary — and `requireNativeModule('ExpoClipboard')` still throws at
 * runtime. Rather than keep a dependency that does not work here, this
 * uses what every React Native app already has linked.
 *
 * So the two platforms genuinely differ, and the wording has to follow:
 * the web copies, and native opens the share sheet, where copying is
 * one of the choices along with AirDrop, Messages and Files. Callers
 * read `CAN_COPY` and say which one they did. A button that says
 * "Copy" and opens a share sheet is the same class of small lie this
 * function exists to stop telling.
 *
 * It answers with a boolean rather than throwing, because "the browser
 * refused" and "they closed the sheet" are both ordinary and neither is
 * exceptional. Note that the web reports a blocked write by throwing
 * and the sheet reports a dismissal by returning — so both have to be
 * handled to know whether anything actually left the app.
 */
export const CAN_COPY = Platform.OS === 'web';

export async function handOff(text: string): Promise<boolean> {
  if (CAN_COPY) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const result = await Share.share({ message: text });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}
