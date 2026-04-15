import Paso1CrearPisos from './primerosPasos/Paso1CrearPisos';

// Re-export the onboarding Piso step to keep the /administracion/creador-piso
// route visually and functionally consistent with the onboarding flow.
import StepNavigator from './StepNavigator';

export default function CrearPiso() {
    return (
        <div style={{ marginTop: '40px', padding: '20px' }}>
            <Paso1CrearPisos onDataSaved={null} />
            <StepNavigator />
        </div>
    );
}