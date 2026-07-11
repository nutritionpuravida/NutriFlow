export function makeSyntheticState(scenario) {
  const profile = {
    age: '42',
    sex: 'Female',
    height: '165',
    weight: '82',
    ...(scenario.profile || {})
  };

  const fields = {
    'p-id': '',
    'p-name': `Synthetic ${scenario.id}`,
    'p-date': '2026-01-15',
    'p-age': String(profile.age ?? ''),
    'p-sex': profile.sex || '',
    'p-activity': 'Light',
    'p-height': String(profile.height ?? ''),
    'p-weight': String(profile.weight ?? ''),
    'p-cal-adj': scenario.goal === 'Weight Gain' ? '300' : scenario.goal === 'Maintenance' ? '0' : '-300',
    'p-goal': scenario.goal || 'Maintenance',
    'p-meat': scenario.meatType || 'Lean',
    'p-dairy': scenario.dairyType || 'Low-fat',
    'p-diet': scenario.diet || 'Omnivore',
    'm-carb': String(scenario.macros?.carb ?? 45),
    'm-protein': String(scenario.macros?.protein ?? 20),
    's-breakfast': scenario.mealSel?.breakfast || 'BRK_TOAST',
    's-lunch': scenario.mealSel?.lunch || 'LUN_CHICKEN_RICE',
    's-dinner': scenario.mealSel?.dinner || 'DIN_FISH_POTATO'
  };

  const mealSel = {
    breakfast: scenario.mealSel?.breakfast || 'BRK_TOAST',
    lunch: scenario.mealSel?.lunch || 'LUN_CHICKEN_RICE',
    dinner: scenario.mealSel?.dinner || 'DIN_FISH_POTATO',
    snack1Extras: scenario.mealSel?.snack1Extras || [],
    snack2Extras: scenario.mealSel?.snack2Extras || [],
    sleepExtras: scenario.mealSel?.sleepExtras || []
  };

  return {
    fields,
    primaryCondition: scenario.condition || 'General',
    conditions: scenario.condition ? [scenario.condition] : [],
    ex: scenario.ex || {},
    exAuto: { starch: false, protein: false, fat: false },
    mealSel,
    mealLanguage: 'GR',
    reportOptions: { oneDay: false, sevenDay: true, includeBlood: true, includeEquivalents: false, days: [0, 1, 2, 3, 4, 5, 6] }
  };
}

