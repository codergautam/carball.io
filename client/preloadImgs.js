const imgs = ['./goal.png', './ball.png', './car.png', './ballArrow.png', './boostimg.png', './background.png']

export default function preloadImages(){
for(const img of imgs){
   const obj = new Image()
  obj.src = img
  // log once loaded
  obj.onload = () => console.log(`${img} loaded`)

}
}