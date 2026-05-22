export const ALL_INGREDIENTS = [
  // Normal mode
  { id: 'tomato',      label: 'Tomate',     color: '#e53e3e', bg: '#fef2f2', border: '#fca5a5', category: 'sauce',   mode: 'normal' },
  { id: 'white',       label: 'Branco',     color: '#c4a87a', bg: '#fffbf0', border: '#e5d4b0', category: 'sauce',   mode: 'normal' },
  { id: 'mozzarella',  label: 'Muçarela',   color: '#d4b84a', bg: '#fffde7', border: '#fef08a', category: 'cheese',  mode: 'normal' },
  { id: 'fish',        label: 'Peixe',      color: '#f97316', bg: '#fff7ed', border: '#fdba74', category: 'topping', mode: 'normal' },
  { id: 'shrimp',      label: 'Camarão',    color: '#fb7185', bg: '#fff1f2', border: '#fda4af', category: 'topping', mode: 'normal' },
  { id: 'mushroom',    label: 'Cogumelo',   color: '#a78bfa', bg: '#f5f3ff', border: '#c4b5fd', category: 'topping', mode: 'normal' },
  { id: 'pepper',      label: 'Pimenta',    color: '#16a34a', bg: '#f0fdf4', border: '#86efac', category: 'topping', mode: 'normal' },
  // Candy mode
  { id: 'chocolate',   label: 'Chocolate',  color: '#92400e', bg: '#fef3c7', border: '#fde68a', category: 'sauce',   mode: 'candy' },
  { id: 'strawberry',  label: 'Morango',    color: '#fb7185', bg: '#fff1f2', border: '#fda4af', category: 'sauce',   mode: 'candy' },
  { id: 'sprinkles',   label: 'Granulado',  color: '#fbbf24', bg: '#fffbeb', border: '#fde68a', category: 'cheese',  mode: 'candy' },
  { id: 'marshmallow', label: 'Marshmallow',color: '#e879a0', bg: '#fdf2f8', border: '#f9a8d4', category: 'topping', mode: 'candy' },
  { id: 'jellybean',   label: 'Jellybean',  color: '#38bdf8', bg: '#f0f9ff', border: '#7dd3fc', category: 'topping', mode: 'candy' },
  { id: 'licorice',    label: 'Alcaçuz',    color: '#1e293b', bg: '#f8fafc', border: '#94a3b8', category: 'topping', mode: 'candy' },
  { id: 'chocochips',  label: 'Choco Chips',color: '#78350f', bg: '#fef3c7', border: '#fde68a', category: 'topping', mode: 'candy' },
]

export function getIng(id) {
  return ALL_INGREDIENTS.find(i => i.id === id)
}

export function getIngsForMode(mode) {
  return ALL_INGREDIENTS.filter(i => i.mode === mode)
}

export function generateOrder(pizzaIndex, mode) {
  const isCandy = mode === 'candy'
  const sauces    = isCandy ? ['chocolate','strawberry'] : ['tomato','white']
  const cheeses   = isCandy ? ['sprinkles']             : ['mozzarella']
  const toppingPool = isCandy
    ? ['marshmallow','jellybean','licorice','chocochips']
    : ['fish','shrimp','mushroom','pepper']

  let toppingCount
  if (isCandy) {
    toppingCount = Math.floor(Math.random() * 4)
  } else if (pizzaIndex < 10) {
    toppingCount = 1
  } else if (pizzaIndex < 20) {
    toppingCount = 1 + Math.floor(Math.random() * 2)
  } else if (pizzaIndex < 30) {
    toppingCount = 2 + Math.floor(Math.random() * 2)
  } else {
    toppingCount = 2 + Math.floor(Math.random() * 3)
  }

  const sauce    = sauces[Math.floor(Math.random() * sauces.length)]
  const cheese   = cheeses[0]
  const shuffled = [...toppingPool].sort(() => Math.random() - 0.5)
  const toppings = shuffled.slice(0, toppingCount)

  return [sauce, cheese, ...toppings]
}
