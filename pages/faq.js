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
    question: 'Can Brandpix.ai be used for ads?',
    answer:
      'Absolutely. We generate ad-ready visuals and copy that you can use across Meta, TikTok, Google, and more. The focus is on strong creative - use the same assets for organic posting while you build presence, and for paid campaigns when you scale. Brandpix.ai is designed to be flexible for your marketing and creative needs. Just treat captions as "copy".'
  },
  {
    id: 2,
    question: 'How do I turn images into short videos?',
    answer:
      'When you generate an image, you use that image to animate into a short video clip. Simple describe what you want the video to look like and it will created for you.'
  },
  {
    id: 3,
    question:
      'Can the AI write captions from my images/videos and brand voice?',
    answer:
      "Yes! Our AI's capable of generating captions from reading both your instruction and the AI image or video."
  },
  {
    id: 4,
    question: 'Where do I use the AI generated assets?',
    answer:
      'The assets are yours. Everything you generate belongs to you. You are free to use them for your organic social media pages, or even for making ads.'
  },
  {
    id: 5,
    question: 'What types of visual content is the AI capable of making?',
    answer:
      'Currently it generates product images and videos. However as new advancements emerge, we will enable new cases.'
  },
  {
    id: 6,
    question:
      'Are these videos like high-end agency / Runway / Kive style ads?',
    answer:
      'At the moment, they’re optimized for fast, 5-second product clips you can drop into TikTok/Reels or ads. Think “quick motion to catch attention,” not big-budget cinematic commercials.'
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
