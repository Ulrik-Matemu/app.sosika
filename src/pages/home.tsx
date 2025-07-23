import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>Sosika | Campus Food Delivery in Tanzania</title>
        <meta
          name="description"
          content="Sosika delivers fast, reliable food from local vendors straight to your campus or nearby areas. Order easily and enjoy!"
        />
        <link rel="canonical" href="https://yourdomain.com/" />
        <meta property="og:title" content="Sosika - Campus Food Delivery" />
        <meta
          property="og:description"
          content="Order food around your campus with Sosika. Reliable, fast delivery from trusted vendors."
        />
        <meta property="og:url" content="https://yourdomain.com/" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <main className="min-h-screen flex flex-col justify-center items-center px-6 py-16 text-center bg-white text-gray-900 max-w-screen-md mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
          Campus Food Delivery Made Easy
        </h1>

        <p className="text-lg md:text-xl mb-8 max-w-xl mx-auto text-gray-700">
          Sosika connects hungry students and locals with trusted restaurants nearby. Order and enjoy fast delivery, right to your dorm or home.
        </p>

        <div className="flex gap-5 flex-wrap justify-center mb-12">
          <Link
            to="/explore"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-semibold transition"
            aria-label="Explore Vendors"
          >
            Explore Vendors
          </Link>

          <Link
            to="/login"
            className="border-2 border-green-600 hover:bg-green-50 text-green-700 px-8 py-3 rounded-full font-semibold transition"
            aria-label="Login to Sosika"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="text-green-600 hover:text-green-800 underline font-semibold self-center"
            aria-label="Create a new Sosika account"
          >
            Create Account
          </Link>
        </div>

        <img
          src="/images/landing-preview.webp"
          alt="Sosika app user interface preview"
          loading="lazy"
          decoding="async"
          className="w-full max-w-md rounded-lg shadow-lg"
          width={400}
          height={300}
        />

        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto text-left">
          {[
            {
              title: "🚀 Fast Delivery",
              desc: "Get your meals within minutes from trusted local vendors.",
            },
            {
              title: "📍 Hyperlocal Focus",
              desc: "Built specifically for campus students and local residents in Arusha.",
            },
            {
              title: "🔒 Secure Payments",
              desc: "Order with confidence using secure and convenient payment options.",
            },
          ].map(({ title, desc }) => (
            <article key={title}>
              <h2 className="text-2xl font-semibold mb-2">{title}</h2>
              <p className="text-gray-600">{desc}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
