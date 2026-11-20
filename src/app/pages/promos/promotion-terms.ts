const itemConditions: Readonly<Record<string, string>> = {
  'combo-guardia': 'El precio corresponde al paquete completo de pizzas, bebidas y pan de ajo.',
  'favorita-memo': 'El 2×1 aplica a las dos pizzas medianas de especialidad incluidas en la oferta.',
  'especial-animatronico': 'El precio aplica a la pizza familiar de carnes frías con orilla rellena.',
  'postre-oficina': 'El precio corresponde a una pieza de pastelillo.',
  'combo-memo-refresco': 'El precio corresponde a la pizza, el refresco de fresa y el mini postre del paquete.',
};

export const promotionTerms = {
  validity: 'Durante la demostración académica, mientras la oferta esté publicada en Promos.',
  availability: 'Sujeta a disponibilidad. El envío se muestra por separado en el carrito.',
  itemConditions,
};
