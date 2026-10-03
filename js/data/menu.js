'use strict';

/**
 * Sample data for the food court. Nothing here is fetched from a server:
 * the site runs entirely in the browser.
 */

/** Menu categories, nested. Loaded into the CategoryTree. */
const MENU_CATEGORIES = {
  id: 'menu',
  name: 'All items',
  children: [
    {
      id: 'meals',
      name: 'Meals',
      children: [
        { id: 'south-indian', name: 'South Indian' },
        { id: 'north-indian', name: 'North Indian' },
        { id: 'rice-noodles', name: 'Rice and noodles' },
      ],
    },
    {
      id: 'snacks',
      name: 'Snacks',
      children: [
        { id: 'chaat', name: 'Chaat' },
        { id: 'rolls-sandwiches', name: 'Rolls and sandwiches' },
        { id: 'fried', name: 'Fried snacks' },
      ],
    },
    {
      id: 'drinks',
      name: 'Drinks',
      children: [
        { id: 'hot-drinks', name: 'Hot' },
        { id: 'cold-drinks', name: 'Cold' },
      ],
    },
    { id: 'desserts', name: 'Desserts' },
  ],
};

/**
 * Menu items, stored in a plain array.
 *   price   rupees
 *   orders  how many were ordered this week (the popularity score)
 *   prep    minutes the kitchen needs
 */
const MENU_ITEMS = [
  { id: 101, name: 'Masala Dosa', category: 'south-indian', price: 60, orders: 412, prep: 8, veg: true, about: 'Crisp rice crepe filled with spiced potato, with sambar and chutney' },
  { id: 102, name: 'Idli Sambar', category: 'south-indian', price: 40, orders: 298, prep: 4, veg: true, about: 'Three steamed rice cakes with sambar and coconut chutney' },
  { id: 103, name: 'Medu Vada', category: 'south-indian', price: 35, orders: 187, prep: 5, veg: true, about: 'Two crisp lentil doughnuts with coconut chutney' },
  { id: 104, name: 'Onion Uttapam', category: 'south-indian', price: 55, orders: 143, prep: 9, veg: true, about: 'Thick rice pancake topped with onion, tomato and green chilli' },
  { id: 105, name: 'Curd Rice', category: 'south-indian', price: 45, orders: 121, prep: 3, veg: true, about: 'Cool yoghurt rice tempered with mustard seeds and curry leaves' },

  { id: 106, name: 'Chole Bhature', category: 'north-indian', price: 80, orders: 265, prep: 10, veg: true, about: 'Spiced chickpea curry with two puffed fried breads' },
  { id: 107, name: 'Paneer Butter Masala', category: 'north-indian', price: 110, orders: 231, prep: 12, veg: true, about: 'Paneer in a creamy tomato gravy, served with two rotis' },
  { id: 108, name: 'Rajma Chawal', category: 'north-indian', price: 70, orders: 204, prep: 6, veg: true, about: 'Kidney bean curry over steamed rice' },
  { id: 109, name: 'Aloo Paratha', category: 'north-indian', price: 50, orders: 318, prep: 8, veg: true, about: 'Potato-stuffed flatbread with curd and pickle' },
  { id: 110, name: 'Butter Chicken', category: 'north-indian', price: 140, orders: 276, prep: 12, veg: false, about: 'Tandoori chicken in butter gravy, served with butter naan' },

  { id: 111, name: 'Veg Biryani', category: 'rice-noodles', price: 90, orders: 254, prep: 10, veg: true, about: 'Basmati rice layered with vegetables, served with raita' },
  { id: 112, name: 'Chicken Biryani', category: 'rice-noodles', price: 130, orders: 389, prep: 12, veg: false, about: 'Dum-cooked basmati rice and chicken, served with raita' },
  { id: 113, name: 'Egg Fried Rice', category: 'rice-noodles', price: 85, orders: 198, prep: 9, veg: false, about: 'Wok-tossed rice with egg, spring onion and soy' },
  { id: 114, name: 'Veg Hakka Noodles', category: 'rice-noodles', price: 75, orders: 222, prep: 9, veg: true, about: 'Stir-fried noodles with cabbage, carrot and capsicum' },

  { id: 115, name: 'Pani Puri', category: 'chaat', price: 30, orders: 356, prep: 3, veg: true, about: 'Six crisp shells with spiced potato and tangy mint water' },
  { id: 116, name: 'Bhel Puri', category: 'chaat', price: 35, orders: 174, prep: 4, veg: true, about: 'Puffed rice tossed with onion, sev and tamarind chutney' },
  { id: 117, name: 'Pav Bhaji', category: 'chaat', price: 70, orders: 301, prep: 8, veg: true, about: 'Buttery mashed-vegetable curry with two toasted buns' },

  { id: 118, name: 'Paneer Kathi Roll', category: 'rolls-sandwiches', price: 75, orders: 243, prep: 7, veg: true, about: 'Grilled paneer and onion wrapped in a flaky paratha' },
  { id: 119, name: 'Chicken Kathi Roll', category: 'rolls-sandwiches', price: 90, orders: 267, prep: 7, veg: false, about: 'Spiced chicken and onion wrapped in a flaky paratha' },
  { id: 120, name: 'Veg Grilled Sandwich', category: 'rolls-sandwiches', price: 50, orders: 229, prep: 6, veg: true, about: 'Toasted sandwich with vegetables, cheese and green chutney' },

  { id: 121, name: 'Vada Pav', category: 'fried', price: 25, orders: 334, prep: 3, veg: true, about: 'Potato fritter in a soft bun with dry garlic chutney' },
  { id: 122, name: 'Samosa', category: 'fried', price: 20, orders: 421, prep: 2, veg: true, about: 'Two potato-and-pea samosas with tamarind chutney' },
  { id: 123, name: 'French Fries', category: 'fried', price: 60, orders: 286, prep: 6, veg: true, about: 'Salted fries with ketchup' },
  { id: 124, name: 'Onion Pakoda', category: 'fried', price: 40, orders: 165, prep: 6, veg: true, about: 'Crisp onion fritters with mint chutney' },

  { id: 125, name: 'Masala Chai', category: 'hot-drinks', price: 15, orders: 498, prep: 2, veg: true, about: 'Milk tea brewed with ginger and cardamom' },
  { id: 126, name: 'Filter Coffee', category: 'hot-drinks', price: 20, orders: 437, prep: 3, veg: true, about: 'South Indian decoction coffee with frothed milk' },
  { id: 127, name: 'Hot Chocolate', category: 'hot-drinks', price: 50, orders: 96, prep: 4, veg: true, about: 'Thick cocoa with steamed milk' },

  { id: 128, name: 'Cold Coffee', category: 'cold-drinks', price: 60, orders: 312, prep: 4, veg: true, about: 'Blended iced coffee with milk' },
  { id: 129, name: 'Sweet Lassi', category: 'cold-drinks', price: 45, orders: 208, prep: 3, veg: true, about: 'Chilled churned yoghurt, lightly sweetened' },
  { id: 130, name: 'Fresh Lime Soda', category: 'cold-drinks', price: 35, orders: 251, prep: 2, veg: true, about: 'Lime juice and soda, sweet or salted' },
  { id: 131, name: 'Mango Milkshake', category: 'cold-drinks', price: 70, orders: 177, prep: 4, veg: true, about: 'Alphonso mango blended with cold milk' },

  { id: 132, name: 'Gulab Jamun', category: 'desserts', price: 30, orders: 219, prep: 2, veg: true, about: 'Two warm milk dumplings in sugar syrup' },
  { id: 133, name: 'Rasmalai', category: 'desserts', price: 45, orders: 132, prep: 2, veg: true, about: 'Two soft cheese patties in saffron milk' },
  { id: 134, name: 'Chocolate Brownie', category: 'desserts', price: 60, orders: 158, prep: 3, veg: true, about: 'Warm walnut brownie' },
  { id: 135, name: 'Kulfi', category: 'desserts', price: 40, orders: 149, prep: 1, veg: true, about: 'Slow-cooked milk ice on a stick, with pistachio' },
];

/**
 * Items that are often ordered together: [item id, item id, strength 1 to 5].
 * Loaded into the Graph as weighted edges.
 */
const MENU_PAIRINGS = [
  [101, 126, 5], [102, 126, 5], [102, 103, 4], [103, 126, 3], [101, 103, 3], [104, 126, 3], [105, 103, 2],
  [106, 129, 5], [109, 129, 4], [109, 125, 4], [108, 129, 3], [106, 133, 2],
  [107, 132, 3], [110, 132, 3], [110, 130, 3],
  [111, 130, 3], [112, 130, 4], [112, 132, 3], [111, 133, 2], [113, 130, 2], [114, 130, 3], [114, 128, 2],
  [115, 116, 4], [115, 135, 2], [116, 125, 2], [117, 130, 3], [117, 125, 2],
  [118, 128, 3], [119, 128, 3], [119, 123, 3],
  [120, 128, 4], [120, 123, 4], [120, 125, 3], [120, 131, 2], [120, 127, 2],
  [121, 125, 5], [122, 125, 5], [124, 125, 5], [122, 132, 2],
  [123, 128, 4], [123, 131, 2],
  [134, 128, 3], [134, 127, 3],
];

/** Made-up students who place the sample and walk-in orders. */
const SAMPLE_STUDENTS = [
  { id: 'STU1012', name: 'Diya S' },
  { id: 'STU1027', name: 'Kabir R' },
  { id: 'STU1033', name: 'Meera N' },
  { id: 'STU1048', name: 'Rohan P' },
  { id: 'STU1056', name: 'Ananya K' },
  { id: 'STU1061', name: 'Farhan A' },
  { id: 'STU1079', name: 'Tara V' },
  { id: 'STU1084', name: 'Arjun M' },
];

/** The orders already in the queue when the site first opens: [student index, [[item id, quantity], ...]] */
const SAMPLE_ORDERS = [
  [0, [[101, 1], [126, 1]]],
  [1, [[112, 1], [130, 1]]],
  [2, [[122, 2], [125, 2]]],
  [3, [[120, 1], [128, 1]]],
];

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') {
  module.exports = { MENU_CATEGORIES, MENU_ITEMS, MENU_PAIRINGS, SAMPLE_STUDENTS, SAMPLE_ORDERS };
}
