import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import App from '../src/App';

describe('App Component', () => {
    test('renders the application', () => {
        render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        );

        expect(document.body).toBeTruthy();
    });
});