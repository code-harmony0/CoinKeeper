import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { KazaHero } from '../../src/components/kaza/KazaHero';
import { KazaPrayerRow } from '../../src/components/kaza/KazaPrayerRow';
import { KazaPlanSheet } from '../../src/components/kaza/KazaPlanSheet';
import { KazaJourney } from '../../src/components/kaza/KazaJourney';
import { KazaReflection } from '../../src/components/kaza/KazaReflection';
import { KazaStats } from '../../src/components/kaza/KazaStats';
import { chapterProgress } from '../../src/services/kazaInsights';

jest.mock('../../src/components/anim', () => {
  const actual = jest.requireActual('../../src/components/anim');
  const { Text } = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');
  return {
    ...actual,
    CountUp: ({ value }: any) => ReactLib.createElement(Text, null, String(value)),
  };
});

describe('KazaHero', () => {
  const heroProps = (over: any = {}) => ({
    pending: 18190,
    completed: 60,
    total: 18250,
    chapter: chapterProgress(60, 18250, 5),
    dailyGoal: 5,
    finishOn: new Date(2030, 0, 15),
    onPlan: jest.fn(),
    ...over,
  });

  it('shows the label, chapter line and chapter day count', () => {
    const { getByText } = render(<KazaHero {...heroProps()} />);
    getByText('Prayers left to make up');
    getByText('Year 1 of 10');
    getByText('12 of 365 days');
  });

  it('shows the finished message when nothing is pending', () => {
    const { getByText, queryByText } = render(<KazaHero {...heroProps({ pending: 0 })} />);
    getByText('All made up. Alhamdulillah.');
    expect(queryByText('Prayers left to make up')).toBeNull();
  });

  it('calls onPlan when the finish-date row is pressed', () => {
    const props = heroProps();
    const { getByText } = render(<KazaHero {...props} />);
    fireEvent.press(getByText(/At 5 a day/));
    expect(props.onPlan).toHaveBeenCalledTimes(1);
  });
});

describe('KazaPrayerRow', () => {
  const rowProps = (over: any = {}) => ({
    prayer: { name: 'Fajr', arabic: 'الفجر', completed: 46, pending: 3969 },
    isLast: false,
    isNext: false,
    isMostBehind: false,
    onPlus: jest.fn(),
    onMinus: jest.fn(),
    ...over,
  });

  it('shows pending and an accessibility label', () => {
    const { getByText, getByLabelText } = render(<KazaPrayerRow {...rowProps()} />);
    getByText('3,969 left');
    getByLabelText('Fajr: 46 made up, 3969 left');
  });

  it('shows Next and Most to go tags only when flagged', () => {
    const none = render(<KazaPrayerRow {...rowProps()} />);
    expect(none.queryByText('Next')).toBeNull();
    expect(none.queryByText('Most to go')).toBeNull();
    const flagged = render(<KazaPrayerRow {...rowProps({ isNext: true, isMostBehind: true })} />);
    flagged.getByText('Next');
    flagged.getByText('Most to go');
  });

  it('calls onPlus and onMinus when enabled', () => {
    const props = rowProps();
    const { getByLabelText } = render(<KazaPrayerRow {...props} />);
    fireEvent.press(getByLabelText('Made up one Fajr'));
    fireEvent.press(getByLabelText('Undo one Fajr'));
    expect(props.onPlus).toHaveBeenCalledTimes(1);
    expect(props.onMinus).toHaveBeenCalledTimes(1);
  });

  it('disables plus when pending is 0 and shows All made up', () => {
    const props = rowProps({ prayer: { name: 'Fajr', arabic: 'الفجر', completed: 10, pending: 0 } });
    const { getByLabelText, getByText } = render(<KazaPrayerRow {...props} />);
    getByText('All made up');
    fireEvent.press(getByLabelText('Made up one Fajr'));
    expect(props.onPlus).not.toHaveBeenCalled();
  });

  it('disables minus when nothing is completed', () => {
    const props = rowProps({ prayer: { name: 'Fajr', arabic: 'الفجر', completed: 0, pending: 10 } });
    const { getByLabelText } = render(<KazaPrayerRow {...props} />);
    fireEvent.press(getByLabelText('Undo one Fajr'));
    expect(props.onMinus).not.toHaveBeenCalled();
  });
});

describe('KazaPlanSheet', () => {
  const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const sheetProps = (over: any = {}) => ({
    visible: true,
    pending: 18250,
    prayers: names.map(name => ({ name, pending: 3650 })),
    prayersPerDay: 5,
    currentGoal: 1,
    recentAverage: 0,
    onClose: jest.fn(),
    onPick: jest.fn(),
    ...over,
  });

  it('shows the total rakat line', () => {
    const { getByText } = render(<KazaPlanSheet {...sheetProps()} />);
    getByText('≈ 62,050 rakat in all');
  });

  it('picks the per-day value for the 3-year target', () => {
    const props = sheetProps();
    const { getByText } = render(<KazaPlanSheet {...props} />);
    fireEvent.press(getByText('In 3 years'));
    expect(props.onPick).toHaveBeenCalledWith(Math.ceil(18250 / Math.ceil(36 * 30.4375)));
    expect(props.onPick).toHaveBeenCalledWith(17);
  });

  it('picks 5 from the "5 a day" pace option', () => {
    const props = sheetProps();
    const { getAllByText } = render(<KazaPlanSheet {...props} />);
    fireEvent.press(getAllByText('5 a day')[0]);
    expect(props.onPick).toHaveBeenCalledWith(5);
  });

  it('shows the empty message when nothing is pending', () => {
    const { getByText, queryByText } = render(
      <KazaPlanSheet {...sheetProps({ pending: 0, prayers: names.map(name => ({ name, pending: 0 })) })} />,
    );
    getByText('Nothing left to make up. Alhamdulillah.');
    expect(queryByText('In 3 years')).toBeNull();
  });
});

describe('KazaJourney', () => {
  it('shows the empty state', () => {
    const { getByText } = render(<KazaJourney days={[]} />);
    getByText('Your journey starts with your first prayer. Every one counts.');
  });

  it('labels today and yesterday with prayer counts', () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
    const days = [
      { key: 'a', date: now, total: 2, prayers: [{ name: 'Fajr', count: 2 }] },
      { key: 'b', date: yesterday, total: 1, prayers: [{ name: 'Isha', count: 1 }] },
    ];
    const { getByText } = render(<KazaJourney days={days} />);
    getByText('Today');
    getByText('Yesterday');
    getByText('Fajr ×2');
    getByText('2 prayers');
    getByText('1 prayer');
  });
});

describe('KazaReflection', () => {
  it('renders text and source', () => {
    const { getByText } = render(
      <KazaReflection reflection={{ text: 'Keep going gently.', source: 'Sahih Muslim' } as any} />,
    );
    getByText('Keep going gently.');
    getByText('Sahih Muslim');
  });
});

describe('KazaStats', () => {
  it('renders the three stats', () => {
    const { getByLabelText } = render(<KazaStats stats={{ week: 12, averagePerDay: 2, bestDay: 5 }} />);
    getByLabelText('This week: 12');
    getByLabelText('Daily average: 2');
    getByLabelText('Best day: 5');
  });
});
