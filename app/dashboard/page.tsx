"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function CreatorDashboard() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    try {
      const { data, error } = await supabase.from("products").insert([
        {
          title,
          description,
          price,
          category,
          image_url: imageUrl,
        },
      ]);

      if (error) {
        throw error;
      }

      setSuccess("Product uploaded successfully!");
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setImageUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white font-sans antialiased flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-700">
        <h2 className="text-5xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600 drop-shadow-lg">
          Creator Dashboard
        </h2>
        <p className="text-center text-gray-400 mb-8 text-lg">
          Upload your amazing digital products to NexusKit.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-gray-300 text-lg font-medium mb-2">Product Title</label>
            <input
              type="text"
              id="title"
              className="w-full p-4 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition duration-300 ease-in-out text-lg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-gray-300 text-lg font-medium mb-2">Description</label>
            <textarea
              id="description"
              rows={5}
              className="w-full p-4 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition duration-300 ease-in-out text-lg"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          <div>
            <label htmlFor="price" className="block text-gray-300 text-lg font-medium mb-2">Price ($)</label>
            <input
              type="number"
              id="price"
              className="w-full p-4 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition duration-300 ease-in-out text-lg"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-gray-300 text-lg font-medium mb-2">Category</label>
            <select
              id="category"
              className="w-full p-4 rounded-xl bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition duration-300 ease-in-out text-lg appearance-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select a category</option>
              <option value="Electronics">Electronics</option>
              <option value="Books">Books</option>
              <option value="Clothing">Clothing</option>
              <option value="Home">Home</option>
              <option value="Sports">Sports</option>
              <option value="Digital Assets">Digital Assets</option>
              <option value="Templates">Templates</option>
              <option value="Software">Software</option>
            </select>
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-gray-300 text-lg font-medium mb-2">Image URL</label>
            <input
              type="url"
              id="imageUrl"
              className="w-full p-4 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition duration-300 ease-in-out text-lg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xl font-bold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload Product"}
          </button>
        </form>

        {success && (
          <div className="mt-8 text-center text-green-500 text-lg font-semibold">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-8 text-center text-red-500 text-lg font-semibold">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
