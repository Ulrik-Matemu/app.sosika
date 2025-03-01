import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer style={footerStyle}>
            <p>&copy; {new Date().getFullYear()} Sosika. All rights reserved.</p>
        </footer>
    );
};

const footerStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: '#333',
    color: 'white',
    textAlign: 'center',
    padding: '10px 0',
};

export default Footer;