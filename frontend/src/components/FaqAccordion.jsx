import { useState } from "react";

export default function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="faq-list">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article key={item.q} className={`faq-item${isOpen ? " open" : ""}`}>
            <button
              type="button"
              className="faq-item-trigger"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span>{item.q}</span>
              <span className="faq-item-icon" aria-hidden="true">
                +
              </span>
            </button>
            <div className="faq-item-body">
              <p>{item.a}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
