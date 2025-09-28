 /*
 import React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";


const EmailSubscriptionForm = () => {
    const [email, setEmail] = React.useState("");
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle email subscription logic here

        alert(`Subscribed!, ${email}`);
    }

    return (
        <>
            <div className="flex w-full max-w-sm items-center gap-2">
                <Input type="email" placeholder="Email" value={email} onChange={handleEmailChange} className="text-black" />
                <Button type="submit" variant="outline" onClick={handleSubmit} >
                    Subscribe
                </Button>
            </div>
        </>
    );
}

*/



export const Maintenance = () => {
    return (
        <>
         <h1 className="text-[#00bfff] text-center bg-gray-100 border-gray-100 text-4xl p-12 font-extrabold">Sosika</h1>
            <div className="flex flex-col items-center min-h-screen bg-gray-100 px-4">
                <img
                    src="/maintenance.svg"
                    alt="Maintenance"
                    className="w-40 h-40 sm:w-64 sm:h-64 mb-4"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />
                <p className="text-base sm:text-lg text-gray-900 mb-8 text-left">
                    We are improving a few things to provide you with top-notch service. We'll notify you once we're back online!
                </p>
                {/* <EmailSubscriptionForm /> */}
            </div>
        </>
    );
}