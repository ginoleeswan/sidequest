import { Ionicons } from '@expo/vector-icons';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';

import type { Game } from '@/api/types';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { CoverImage } from '@/components/CoverImage';
import { FadeInView } from '@/components/FadeInView';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Message } from '@/components/Message';
import { SectionHeader } from '@/components/SectionHeader';
import { SteamConnect } from '@/components/SteamConnect';
import { Textured } from '@/components/Textured';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useLibrary } from '@/lib/library';
import {
  pickTonight,
  planSchedule,
  type PlanItem,
  type ScheduledItem,
} from '@/lib/scheduler';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const PACE_OPTIONS = [2, 4, 6, 8, 12, 20];
const WINDOW_OPTIONS = [
  { label: 'No deadline', weeks: null },
  { label: '2 weeks', weeks: 2 },
  { label: '1 month', weeks: 4.35 },
  { label: '3 months', weeks: 13 },
];
const SESSION_OPTIONS = [30, 60, 90, 180];

const finishDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface Entry {
  game: Game;
  hours: number;
  playing: boolean;
}

function ScheduleRow({
  item,
  index,
  game,
}: {
  item: ScheduledItem;
  index: number;
  game?: Game;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIndex}>{index + 1}</Text>
      <CoverImage
        uri={game?.background_image}
        style={styles.rowThumb}
        iconSize={16}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowMeta}>~{Math.round(item.hours)}h</Text>
      </View>
      <View style={styles.rowWhen}>
        <Text style={styles.rowDate}>{finishDate(item.finishAt)}</Text>
        <Text style={styles.rowDateLabel}>done by</Text>
      </View>
    </View>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const { byStatus } = useLibrary();

  const [pace, setPace] = usePersistedState('sidequest.plan.pace', 6);
  const [windowWeeks, setWindowWeeks] = usePersistedState<number | null>(
    'sidequest.plan.window',
    null
  );
  const [session, setSession] = useState(60);

  // Playing games count at half their estimate - you're partway in.
  const entries: Entry[] = useMemo(
    () => [
      ...byStatus('playing').map((e) => ({
        game: e.game,
        hours: (e.game.playtime ?? 0) * 0.5,
        playing: true,
      })),
      ...byStatus('wishlist').map((e) => ({
        game: e.game,
        hours: e.game.playtime ?? 0,
        playing: false,
      })),
    ],
    [byStatus]
  );

  const gamesById = useMemo(
    () => new Map(entries.map((e) => [e.game.id, e.game])),
    [entries]
  );

  // Captured once per visit: a stable "now" keeps render pure and the
  // projected dates steady while you fiddle with the controls.
  const [now] = useState(() => Date.now());

  const schedule = useMemo(() => {
    const items: PlanItem[] = entries
      .filter((e) => e.hours > 0)
      .map((e) => ({ id: e.game.id, name: e.game.name, hours: e.hours }));
    return planSchedule(items, {
      hoursPerWeek: pace,
      now,
      deadline: windowWeeks != null ? now + windowWeeks * WEEK_MS : undefined,
    });
  }, [entries, pace, windowWeeks, now]);

  const unknown = entries.filter((e) => e.hours <= 0);

  const tonight = useMemo(
    () =>
      pickTonight(
        entries.map((e) => ({
          id: e.game.id,
          name: e.game.name,
          hours: e.hours,
          playing: e.playing,
        })),
        session
      ),
    [entries, session]
  );

  const tonightPick =
    tonight.finishable ?? tonight.continueGame ?? tonight.shortest;
  const tonightVerb = tonight.finishable
    ? 'Finish'
    : tonight.continueGame
      ? 'Continue'
      : 'Start';

  const empty = entries.length === 0;
  const allFit = schedule.dropped.length === 0 && schedule.scheduled.length > 0;
  const lastFinish =
    schedule.scheduled[schedule.scheduled.length - 1]?.finishAt;

  return (
    <Textured style={styles.background}>
      <Head>
        <title>The Plan — Sidequest</title>
      </Head>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}

      <View style={{ paddingBottom: SPACING.xl * 1.5 }}>
        <FadeInView>
          <View
            style={[
              styles.inner,
              {
                paddingTop: isExpanded
                  ? SPACING.xl * 1.5
                  : insets.top + SPACING.xl * 2,
              },
            ]}
          >
            <SectionHeader
              title="The Plan"
              eyebrow={empty ? undefined : `${entries.length} in your queue`}
            />

            <SteamConnect onUsePace={setPace} />

            {empty ? (
              <Message
                icon="map-outline"
                title="Nothing to plan yet"
                detail="Save games to your library — Want to play or Playing — and the plan builds itself."
                actionLabel="Find games"
                onAction={() => router.push('/')}
              />
            ) : (
              <>
                {/* controls */}
                <View style={styles.controls}>
                  <View style={styles.controlGroup}>
                    <Text style={TYPE.micro}>Hours you play per week</Text>
                    <View style={styles.chipRow}>
                      {!PACE_OPTIONS.includes(pace) && (
                        <Chip title={`${pace}h · Steam`} selected />
                      )}
                      {PACE_OPTIONS.map((option) => (
                        <Chip
                          key={option}
                          title={`${option}h`}
                          selected={pace === option}
                          onPress={() => setPace(option)}
                        />
                      ))}
                    </View>
                  </View>
                  <View style={styles.controlGroup}>
                    <Text style={TYPE.micro}>Finish window</Text>
                    <View style={styles.chipRow}>
                      {WINDOW_OPTIONS.map((option) => (
                        <Chip
                          key={option.label}
                          title={option.label}
                          selected={windowWeeks === option.weeks}
                          onPress={() => setWindowWeeks(option.weeks)}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                {/* verdict */}
                <View style={styles.verdict}>
                  <View style={styles.verdictBar} />
                  <Text style={styles.verdictTitle}>
                    {schedule.scheduled.length === 0
                      ? 'Nothing fits this window'
                      : allFit
                        ? `All ${schedule.scheduled.length} fit at ${pace}h a week`
                        : `${schedule.scheduled.length} fit · ${schedule.dropped.length} won't`}
                  </Text>
                  <Text style={styles.verdictDetail}>
                    {schedule.scheduled.length > 0 && lastFinish
                      ? `~${Math.round(schedule.totalHours)} hours of play, done by ${finishDate(lastFinish)}. Estimates from RAWG average playtimes.`
                      : 'Widen the window or raise the pace — or let some of these go.'}
                  </Text>
                </View>

                {/* tonight */}
                {tonightPick && (
                  <View style={styles.tonight}>
                    <View style={styles.tonightHead}>
                      <Ionicons
                        name="moon"
                        size={14}
                        color={COLORS.mediumGrey}
                      />
                      <Text style={TYPE.micro}>Tonight I have…</Text>
                    </View>
                    <View style={styles.chipRow}>
                      {SESSION_OPTIONS.map((minutes) => (
                        <Chip
                          key={minutes}
                          title={
                            minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`
                          }
                          selected={session === minutes}
                          onPress={() => setSession(minutes)}
                        />
                      ))}
                    </View>
                    <Text style={styles.tonightPick}>
                      {tonightVerb}{' '}
                      <Text
                        style={styles.tonightName}
                        onPress={() => router.push(`/game/${tonightPick.id}`)}
                      >
                        {tonightPick.name}
                      </Text>
                      {tonight.finishable
                        ? ` — you can see the credits tonight.`
                        : tonight.continueGame
                          ? ` — chip away at it.`
                          : ` — it’s the shortest thing you’ve saved.`}
                    </Text>
                  </View>
                )}

                {/* the schedule */}
                {schedule.scheduled.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader title="Play in this order" />
                    <View style={styles.rows}>
                      {schedule.scheduled.map((item, index) => (
                        <ScheduleRow
                          key={item.id}
                          item={item}
                          index={index}
                          game={gamesById.get(item.id)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* the honest part */}
                {schedule.dropped.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Not this time — and that's fine"
                      eyebrow={`${schedule.dropped.length} games`}
                    />
                    <Text style={styles.droppedNote}>
                      At {pace}h a week these need more room than the window
                      has. They’ll still be here.
                    </Text>
                    <View style={styles.rows}>
                      {schedule.dropped.map((item) => (
                        <View
                          key={item.id}
                          style={[styles.row, styles.rowMuted]}
                        >
                          <CoverImage
                            uri={gamesById.get(item.id)?.background_image}
                            style={styles.rowThumb}
                            iconSize={16}
                          />
                          <View style={styles.rowBody}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.rowMeta}>
                              {item.hours > 0
                                ? `needs ~${Math.round(item.hours)}h`
                                : 'length unknown'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {unknown.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Length unknown"
                      eyebrow={`${unknown.length} games`}
                    />
                    <Text style={styles.droppedNote}>
                      RAWG has no playtime estimate for these yet, so the plan
                      can’t place them.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </FadeInView>
      </View>
      <SiteFooter />
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  controls: { gap: SPACING.md },
  controlGroup: { gap: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },

  verdict: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.sm,
    overflow: 'hidden',
  },
  verdictBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.plum,
  },
  verdictTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 19,
    color: COLORS.white,
  },
  verdictDetail: {
    fontFamily: 'Noah-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.mediumGrey,
  },

  tonight: {
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.sm + 2,
  },
  tonightHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tonightPick: {
    fontFamily: 'Noah-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.lightGrey,
  },
  tonightName: { fontFamily: 'Noah-Black', color: COLORS.white },

  section: { gap: SPACING.sm + 2 },
  rows: { gap: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
  },
  rowMuted: { opacity: 0.65 },
  rowIndex: {
    fontFamily: 'Noah-Black',
    fontSize: 14,
    color: COLORS.mediumGrey,
    width: 18,
    textAlign: 'center',
  },
  rowThumb: { width: 56, height: 35, borderRadius: 6 },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: {
    fontFamily: 'Noah-Bold',
    fontSize: 14,
    color: COLORS.lightGrey,
  },
  rowMeta: {
    fontFamily: 'Noah-Regular',
    fontSize: 11.5,
    color: COLORS.mediumGrey,
  },
  rowWhen: { alignItems: 'flex-end', gap: 1 },
  rowDate: {
    fontFamily: 'Noah-Black',
    fontSize: 13,
    color: COLORS.lightGrey,
  },
  rowDateLabel: {
    fontFamily: 'Noah-Regular',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.mediumGrey,
  },
  droppedNote: {
    fontFamily: 'Noah-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.mediumGrey,
  },
});
