import React from "react";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-8 text-center leading-tight">
          About Our Company
        </h1>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Welcome to our e-commerce platform, where we strive to provide the best products and an unparalleled shopping experience. Founded with a passion for quality and customer satisfaction, we have grown into a trusted name in the industry.
        </p>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Our mission is to offer a curated selection of high-quality items, ranging from everyday essentials to unique finds, all while maintaining competitive prices. We believe in transparency, integrity, and building lasting relationships with our customers.
        </p>
        <h2 className="text-3xl font-bold text-gray-800 mb-4 mt-8">
          Our Vision
        </h2>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          To be the leading online retail destination, recognized for our exceptional product range, innovative technology, and unwavering commitment to customer service. We envision a future where shopping is convenient, enjoyable, and rewarding for everyone.
        </p>
        <h2 className="text-3xl font-bold text-gray-800 mb-4 mt-8">
          Our Values
        </h2>
        <ul className="list-disc list-inside text-lg text-gray-700 mb-6 space-y-2">
          <li>
            <strong>Customer Focus:</strong> We prioritize our customers' needs and strive to exceed their expectations.
          </li>
          <li>
            <strong>Quality Assurance:</strong> We ensure all products meet the highest standards of quality and durability.
          </li>
          <li>
            <strong>Innovation:</strong> We continuously seek new ways to improve our platform and services.
          </li>
          <li>
            <strong>Integrity:</strong> We conduct our business with honesty, ethics, and transparency.
          </li>
          <li>
            <strong>Community:</strong> We believe in giving back and fostering a positive impact on society.
          </li>
        </ul>
        <p className="text-lg text-gray-700 leading-relaxed">
          Thank you for choosing us. We are dedicated to making your experience delightful and look forward to serving you.
        </p>
      </div>
    </div>
  );
};

export default AboutPage;