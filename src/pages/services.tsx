import { Link } from "react-router-dom";
import { Header } from "../components/my-components/header";

export const Services: React.FC = () => {
    const services = [
        { title: "Food Delivery", description: "Order food from your favorite campus vendors.", link: '/explore' },
        { title: "Printing", description: "Print your assignment and get it delivered.", link: '/printing' },
      ];
    
      return (
        <>
        <Header />
    
          <main className="p-6 min-h-screen bg-gray-100 dark:bg-[#1e1e1e]">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-white">Our Services</h2>
    
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {services.map((service, index) => (
                <Link to={service.link}>
                <div
                  key={index}
                  className="p-6 bg-[#ededed] dark:bg-[#2b2b2b] rounded-2xl shadow hover:shadow-lg transition"
                >
                  <h3 className="text-xl font-semibold mb-2 text-[#00bfff]">{service.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{service.description}</p>
                </div>
                </Link>
              ))}
            </div>
          </main>
        </>
      );
}