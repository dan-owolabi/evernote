
                    (() => {
                        const host = window.location.hostname;
                        const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
                        const forceEnable = new URLSearchParams(window.location.search).get('agentation') === '1';
                        const forceDisable = new URLSearchParams(window.location.search).get('agentation') === '0';

                        if ((!isLocalHost && !forceEnable) || forceDisable) return;

                        const endpoint = 'http://localhost:4747';
                        const sessionStorageKey = 'agentation:sessionId';
                        const mount = document.createElement('div');
                        mount.id = 'agentation-root';
                        document.body.appendChild(mount);

                        Promise.all([
                            import('https://esm.sh/react@18.3.1'),
                            import('https://esm.sh/react-dom@18.3.1/client'),
                            import('https://esm.sh/agentation@2.2.1?deps=react@18.3.1,react-dom@18.3.1')
                        ]).then(([React, ReactDOMClient, AgentationPkg]) => {
                            const { createElement } = React;
                            const { createRoot } = ReactDOMClient;
                            const { Agentation } = AgentationPkg;
                            const existingSessionId = localStorage.getItem(sessionStorageKey) || undefined;

                            createRoot(mount).render(
                                createElement(Agentation, {
                                    endpoint,
                                    sessionId: existingSessionId,
                                    onSessionCreated: (sessionId) => {
                                        localStorage.setItem(sessionStorageKey, sessionId);
                                        console.log('Agentation session started:', sessionId);
                                    }
                                })
                            );
                        }).catch((error) => {
                            console.error('Agentation failed to initialize:', error);
                        });
                    })();
    
