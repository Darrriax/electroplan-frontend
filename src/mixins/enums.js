export const DATES = [
    {
        id: 1,
        type: "date",
        placeholder: "DD/MM/YYYY",
        checked: true,
        min: "1600-01-01",
        max: new Date().toISOString().split('T')[0], // Поточна дата
        text: "ui.lifetime_info_date.exact",
        birthday_text: "ui.birthday_types.date",
        deathdate_text: "ui.deathdate_types.date",
    },
    {
        id: 2,
        type: "month",
        placeholder: "MM/YYYY",
        checked: false,
        min: "1600-01",
        max: new Date().toISOString().split('-').slice(0, 2).join('-'), // Рік-місяць поточної дати
        text: "ui.lifetime_info_date.month",
        birthday_text: "ui.birthday_types.month",
        deathdate_text: "ui.deathdate_types.month",
    },
    {
        id: 3,
        type: "number",
        placeholder: "YYYY",
        checked: false,
        min: "1600",
        max: new Date().getFullYear().toString(), // Поточний рік
        text: "ui.lifetime_info_date.year",
        birthday_text: "ui.birthday_types.number",
        deathdate_text: "ui.deathdate_types.number",
    },
];
