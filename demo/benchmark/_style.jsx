export default function Style() {
  return <style>{`.container {
    position: absolute;
    inset: 0 0 0 0;
    background: rgb(50,50,50);
    display: flex;
    flex-flow: row wrap;
  }
  
  .container > .bench {
    position: relative;
    flex: 1;
    padding: 2rem;
    text-align: center;
    color: white;
  }
  
  .container > .controls {
    position: absolute;
    display: flex;
    bottom: 5rem;
    left: 50%;
    transform: translateX(-50%);
  }
  
  .container > .controls > button {
    flex: none;
    height: 4rem;
    width: 10rem;
    text-align: center;
  }
  
  .container > .bench > .container {
    position: absolute;
    inset: 0;
    display: block;
    overflow: hidden;
    background: none;
  }
  .container > .bench > .container > * {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }`}</style>;
}