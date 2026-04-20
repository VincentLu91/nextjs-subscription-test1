import { useState } from 'react';
import Head from 'next/head';

const FAQItem = ({ question, answer, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full border-b border-black/10">
      <button
        className="w-full inline-flex justify-between items-center py-5 text-left"
        onClick={toggleExpansion}
        aria-expanded={isExpanded}
        aria-controls={`answer-${id}`}
      >
        <span className="text-lg text-black font-semibold leading-[1.4]">
          {question}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-250 ease-in-out ${
            isExpanded ? 'rotate-45' : ''
          }`}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M8 0v16M0 8h16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </button>
      <div
        id={`answer-${id}`}
        role="region"
        className={`pl-8 overflow-hidden transition-all duration-300 ease-[cubic-bezier(.25,.8,.25,1)] ${
          isExpanded ? 'max-h-[500px] opacity-100 mb-5' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="text-black leading-[1.6] font-normal">{answer}</div>
      </div>
    </div>
  );
};

const faqData = [
  {
    id: 1,
    question: 'How is BrandPix different from other AI creative tools?',
    answer:
      'BrandPix is built to help you turn product photos into a simple weekly content pack. Instead of bouncing between lots of controls, models, and workflows, you can generate images, short videos, and captions in one place with less trial and error.'
  },
  {
    id: 2,
    question:
      'Do I need to know prompting or photography terms to use BrandPix?',
    answer:
      'No. You can describe your scene idea in plain language, use a preset, or upload reference images. BrandPix is designed so you do not need to learn complex prompt tricks or camera jargon just to get usable content.'
  },
  {
    id: 3,
    question: 'Why use BrandPix if I already have access to other AI tools?',
    answer:
      'If you already know other tools, BrandPix may still save you time. It is designed for people who are tired of spending too long tweaking prompts, testing workflows, and chasing one usable post. The goal is a simpler path from product photo to finished content. For small physical product and solo ecomm businesses, this drastically puts them on even playing field with bigger brands. '
  },
  {
    id: 4,
    question: 'What kind of content can I make with one product photo?',
    answer:
      'You can turn one product photo into a small content pack that may include styled product images, short videos, and captions for platforms like TikTok and Instagram. It is meant to help you build a buffer of content for busy weeks.'
  },
  {
    id: 5,
    question:
      'Is BrandPix for beginners or people already familiar with AI tools?',
    answer:
      'Both can use it, but it is especially helpful for people who already know AI creative tools and want a simpler workflow. If you are tired of bloated interfaces, too much trial and error, or overthinking every prompt, BrandPix is built with that in mind.'
  },
  {
    id: 6,
    question:
      'Which models does BrandPix use to generate content, and can I choose which ones to use?',
    answer:
      'BrandPix uses a curated mix of models behind the scenes for images, videos, and captions. Rather than exposing lots of bloated controls, we keep the workflow simple so you can focus on creating content instead of comparing models. As the technology improves, we’ll continue updating the models inside BrandPix.'
  }
];

export default function FAQ() {
  return (
    <div>
      <Head>
        <title>FAQ - Brandpix.ai</title>
      </Head>
      <section className="bg-[#181818] mb-32">
        <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-white sm:text-6xl text-center mb-12">
            FAQ
          </h1>
          <div className="bg-white rounded-lg p-6 md:p-8">
            {faqData.map((faq) => (
              <FAQItem key={faq.id} {...faq} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
